import { useEffect, useState } from "react";
import { CheckIcon, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Token {
  id: number;
  tokenId: string;
  name: string;
  symbol: string;
}

export function TokenThemeSelector() {
  const { tokenTheme, setTokenTheme } = useTheme();
  const [open, setOpen] = useState(false);
  
  // Fetch tokens for selection
  const { data: tokens = [], isLoading } = useQuery<Token[]>({
    queryKey: ['/api/tokens'],
  });

  // Get the current token display name
  const selectedToken = tokens.find(token => token.tokenId === tokenTheme);

  // Clear token theme if the associated token no longer exists
  useEffect(() => {
    if (tokenTheme && tokens.length > 0 && !selectedToken) {
      setTokenTheme(null);
    }
  }, [tokens, tokenTheme, selectedToken, setTokenTheme]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={open} 
          className="justify-between min-w-[200px]"
        >
          {tokenTheme ? (
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: `var(--token-color)` }}
              />
              {selectedToken ? `${selectedToken.symbol} Theme` : "Custom Theme"}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Default Theme</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[250px]">
        <Command>
          <CommandInput placeholder="Search tokens..." />
          <CommandList>
            <CommandEmpty>No tokens found.</CommandEmpty>
            <CommandGroup heading="Available Tokens">
              <CommandItem
                value="default"
                onSelect={() => {
                  setTokenTheme(null);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>Default Theme</span>
                </div>
                <CheckIcon
                  className={cn(
                    "ml-auto h-4 w-4",
                    tokenTheme === null ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
              {tokens.map((token) => (
                <CommandItem
                  key={token.tokenId}
                  value={token.tokenId}
                  onSelect={() => {
                    setTokenTheme(token.tokenId);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ 
                        backgroundColor: token.tokenId === tokenTheme 
                          ? 'var(--token-color)' 
                          : getColorFromTokenId(token.tokenId)
                      }}
                    />
                    <span>{token.symbol} Theme</span>
                  </div>
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      token.tokenId === tokenTheme ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Simple function to generate a color from token ID for preview
function getColorFromTokenId(tokenId: string): string {
  let hash = 0;
  for (let i = 0; i < tokenId.length; i++) {
    hash = ((hash << 5) - hash) + tokenId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const hue = Math.abs(hash % 360); // 0-359 for hue
  return `hsl(${hue}, 80%, 50%)`;
}