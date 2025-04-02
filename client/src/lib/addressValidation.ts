import axios from 'axios';

export interface AddressValidationResult {
  isValid: boolean;
  message?: string;
  suggestions?: string[];
}

export interface Address {
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

/**
 * Performs basic client-side address validation
 */
export async function validateAddressBasic(address: Address): Promise<AddressValidationResult> {
  // Basic format validation
  if (!address.address || address.address.length < 5) {
    return {
      isValid: false,
      message: "Address is too short and may be incomplete."
    };
  }

  if (!address.city || address.city.length < 2) {
    return {
      isValid: false,
      message: "Please enter a valid city name."
    };
  }

  if (!address.state || address.state.length < 2) {
    return {
      isValid: false,
      message: "Please enter a valid state/province."
    };
  }

  // Zip code validation based on country
  const zipRegexByCountry: Record<string, RegExp> = {
    'US': /^\d{5}(-\d{4})?$/,
    'CA': /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
    'GB': /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i,
    'AU': /^\d{4}$/,
    'DE': /^\d{5}$/,
    'FR': /^\d{5}$/,
    'JP': /^\d{3}-\d{4}$/,
    'CN': /^\d{6}$/,
    'IN': /^\d{6}$/,
    'BR': /^\d{5}-\d{3}$/,
  };

  const zipRegex = zipRegexByCountry[address.country] || /^\w+$/;
  if (!zipRegex.test(address.zip.trim())) {
    return {
      isValid: false,
      message: `The postal code doesn't match the format for ${address.country}.`,
      suggestions: ["Ensure the postal code is in the correct format for the selected country."]
    };
  }

  // Check for suspicious patterns in the address
  const suspiciousPatterns = [
    'test', 'fake', 'invalid', 'asdf', '1234'
  ];

  for (const pattern of suspiciousPatterns) {
    if (
      address.address.toLowerCase().includes(pattern) ||
      address.city.toLowerCase().includes(pattern)
    ) {
      return {
        isValid: false,
        message: "The address appears to contain test or invalid data."
      };
    }
  }

  // If all basic validation passes
  return { isValid: true };
}

/**
 * Validates an address using an external API service
 * Note: In a production environment, you would integrate with a real address validation API
 * like SmartyStreets, USPS, Google Address Validation, etc.
 */
export async function validateAddressExternal(address: Address): Promise<AddressValidationResult> {
  try {
    // This would be replaced with a real API call in production
    // For demo purposes, we'll just simulate a successful validation for realistic addresses
    // and reject obviously fake ones

    // Simulated API response for basic validation
    const result = await validateAddressBasic(address);
    
    // If basic validation fails, return that result
    if (!result.isValid) {
      return result;
    }
    
    // For a real implementation, you would make an API call like:
    /*
    const response = await axios.post('https://api.validation-service.com/validate', {
      address: address.address,
      address2: address.address2,
      city: address.city,
      state: address.state,
      postalCode: address.zip,
      country: address.country
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    return {
      isValid: response.data.valid,
      message: response.data.message,
      suggestions: response.data.suggestions
    };
    */

    // Simple format check for house number + street name pattern for US addresses
    if (address.country === 'US') {
      const usAddressRegex = /^\d+\s+\w+/;
      if (!usAddressRegex.test(address.address)) {
        return {
          isValid: false,
          message: "US addresses should start with a house number followed by street name",
          suggestions: ["Example: 123 Main Street"]
        };
      }
    }

    // Since this is a simulated response, we'll return success for addresses that pass basic validation
    return { isValid: true };

  } catch (error) {
    console.error("Address validation error:", error);
    return {
      isValid: false,
      message: "Unable to validate address at this time. Please double-check your information."
    };
  }
}