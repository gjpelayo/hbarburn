import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRedemption } from "@/context/RedemptionContext";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateAddressBasic, Address } from "@/lib/addressValidation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle, Loader2 } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" })
    .refine(
      (email) => {
        // More comprehensive email validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
      },
      { message: "Invalid email format. Please use a standard email address (e.g. name@example.com)" }
    ),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  address2: z.string().optional(),
  city: z.string().min(2, {
    message: "City must be at least 2 characters.",
  }),
  state: z.string().min(2, {
    message: "State/Province must be at least 2 characters.",
  }),
  zip: z.string().min(3, {
    message: "Postal code must be at least 3 characters.",
  }),
  country: z.string().min(2, {
    message: "Please select a country.",
  }),
  phone: z.string()
    .min(5, { message: "Phone number must be at least 5 characters" })
    .refine(
      (phone) => {
        // Basic phone validation to ensure it contains at least some digits
        // (we don't want to be too strict due to international formats)
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
        return phoneRegex.test(phone);
      },
      { message: "Please enter a valid phone number format" }
    ),
});

const countries = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
];

type FormValues = z.infer<typeof formSchema>;

export function ShippingStep({ 
  onBack, 
  onContinue 
}: { 
  onBack: () => void; 
  onContinue: () => void 
}) {
  const { shippingInfo, setShippingInfo } = useRedemption();
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidationResult, setAddressValidationResult] = useState<{
    isValid: boolean;
    message?: string;
    suggestions?: string[];
  } | null>(null);
  const [overrideValidation, setOverrideValidation] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: shippingInfo || {
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      phone: "",
    },
  });

  // Function to validate address
  const validateAddress = async (address: Address) => {
    setIsValidatingAddress(true);
    try {
      const result = await validateAddressBasic(address);
      setAddressValidationResult(result);
      return result.isValid;
    } catch (error) {
      console.error("Error validating address:", error);
      setAddressValidationResult({
        isValid: false,
        message: "An error occurred while validating the address."
      });
      return false;
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    // Validate address before proceeding (unless override is active)
    if (!overrideValidation && (!addressValidationResult || !addressValidationResult.isValid)) {
      const addressData: Address = {
        address: values.address,
        address2: values.address2,
        city: values.city,
        state: values.state,
        zip: values.zip,
        country: values.country
      };
      
      const isValid = await validateAddress(addressData);
      
      if (!isValid) {
        // If validation fails, stop here unless user has chosen to override
        return;
      }
    }
    
    // Either address is valid or user chose to override validation
    setShippingInfo(values);
    onContinue();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">Shipping Information</h2>
        <p className="text-neutral-500 mb-6">Enter your shipping details where you'd like to receive your physical goods.</p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apartment, suite, etc. (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Apt 4B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Anytown" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder="CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Validate address button */}
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isValidatingAddress}
                onClick={() => {
                  const formValues = form.getValues();
                  const addressData: Address = {
                    address: formValues.address,
                    address2: formValues.address2,
                    city: formValues.city,
                    state: formValues.state,
                    zip: formValues.zip,
                    country: formValues.country
                  };
                  validateAddress(addressData);
                }}
              >
                {isValidatingAddress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>Validate Address</>
                )}
              </Button>
              <FormDescription className="text-center mt-1 text-xs">
                Click to validate your address before submitting
              </FormDescription>
            </div>
            
            {/* Address validation feedback */}
            {addressValidationResult && (
              <Alert variant={addressValidationResult.isValid ? "default" : "destructive"} className="mt-4">
                <div className="flex items-start">
                  {addressValidationResult.isValid ? (
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  )}
                  <div>
                    <AlertTitle>
                      {addressValidationResult.isValid 
                        ? "Address Validation Successful" 
                        : "Address Validation Failed"}
                    </AlertTitle>
                    <AlertDescription>
                      {addressValidationResult.message}
                      
                      {addressValidationResult.suggestions && addressValidationResult.suggestions.length > 0 && (
                        <ul className="mt-2 ml-4 list-disc">
                          {addressValidationResult.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      )}
                      
                      {/* Manual override option for failed validation */}
                      {!addressValidationResult.isValid && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="override-validation"
                              checked={overrideValidation}
                              onChange={(e) => setOverrideValidation(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/80"
                            />
                            <label htmlFor="override-validation" className="text-sm font-medium">
                              I confirm my address is correct and want to proceed anyway
                            </label>
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
            
            <div className="mt-6 flex justify-between items-center">
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
              
              <div className="flex items-center space-x-3">
                {isValidatingAddress && (
                  <div className="flex items-center text-sm text-neutral-500">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating address...
                  </div>
                )}
                <Button 
                  type="submit" 
                  disabled={isValidatingAddress || (addressValidationResult !== null && !addressValidationResult.isValid && !overrideValidation)}
                >
                  Continue to Confirmation
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
