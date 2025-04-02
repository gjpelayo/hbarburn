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
      message: "Address is too short and may be incomplete.",
      suggestions: [
        "Include the building/house number and street name",
        "Make sure to enter the complete street address"
      ]
    };
  }

  if (!address.city || address.city.length < 2) {
    return {
      isValid: false,
      message: "Please enter a valid city name.",
      suggestions: [
        "Enter the full city name without abbreviations",
        "Check for typos in the city name"
      ]
    };
  }

  if (!address.state || address.state.length < 2) {
    return {
      isValid: false,
      message: "Please enter a valid state/province.",
      suggestions: [
        "For US addresses, use the 2-letter state code (e.g. CA, NY, TX)",
        "For other countries, enter the full province or region name"
      ]
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
        message: "The address appears to contain test or invalid data.",
        suggestions: [
          "Please enter your actual shipping address",
          "We need a valid address to deliver your physical goods"
        ]
      };
    }
  }
  
  // Check for PO Box addresses which may not be acceptable for physical deliveries
  if (/\b[Pp]\.?[Oo]\.?\s*[Bb][Oo][Xx]\b/.test(address.address)) {
    return {
      isValid: false,
      message: "PO Box addresses are not accepted for physical item deliveries.",
      suggestions: [
        "Please provide a physical street address for delivery",
        "We cannot ship physical items to PO Boxes"
      ]
    };
  }

  // If all basic validation passes
  return { 
    isValid: true,
    message: "Address validation successful. Your items will be shipped to this address."
  };
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
    return { 
      isValid: true,
      message: "Address validation confirmed by our system. Your physical items will be shipped to this address."
    };

  } catch (error) {
    console.error("Address validation error:", error);
    return {
      isValid: false,
      message: "Unable to validate address at this time. Please double-check your information.",
      suggestions: [
        "Our address validation service is experiencing issues",
        "You can try again in a few moments",
        "Or check 'I confirm my address is correct' to proceed anyway"
      ]
    };
  }
}