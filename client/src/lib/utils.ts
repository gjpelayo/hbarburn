import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ShippingInfo } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFormattedAddress(info: ShippingInfo): string {
  const addressParts = [
    info.address,
    info.address2,
    `${info.city}, ${info.state} ${info.zip}`,
    getCountryName(info.country)
  ].filter(Boolean);
  
  return addressParts.join(", ");
}

export function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    US: "United States",
    CA: "Canada",
    UK: "United Kingdom",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    JP: "Japan",
    // Add more countries as needed
  };
  
  return countryNames[countryCode] || countryCode;
}
