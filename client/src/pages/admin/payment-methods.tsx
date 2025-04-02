import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, PlusCircle, Trash2 } from "lucide-react";

// This is a placeholder component until Stripe integration is completed
const PaymentMethodCard = ({ 
  card, 
  isDefault, 
  onRemove, 
  onSetDefault 
}: { 
  card: { brand: string; last4: string; expMonth: number; expYear: number; id: string };
  isDefault: boolean;
  onRemove: (id: string) => void;
  onSetDefault: (id: string) => void;
}) => {
  return (
    <Card className={`relative ${isDefault ? 'border-primary' : ''}`}>
      {isDefault && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
          Default
        </div>
      )}
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle className="text-lg capitalize">{card.brand}</CardTitle>
        </div>
        <CardDescription>Ending in {card.last4}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Expires {card.expMonth}/{card.expYear}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        {!isDefault && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onSetDefault(card.id)}
          >
            Set as default
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(card.id)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function PaymentMethodsPage() {
  const { toast } = useToast();
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  
  // Placeholder payment methods - these would typically come from your database or Stripe
  const [paymentMethods, setPaymentMethods] = useState<Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }>>([
    {
      id: "pm_123",
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2025
    }
  ]);
  
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("pm_123");

  // Placeholder for card input form
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvc: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCard = () => {
    // This is where we would normally create the payment method with Stripe
    // For now, we'll just add a placeholder card to the UI
    
    // Validation checks
    if (!cardDetails.cardNumber || !cardDetails.expMonth || !cardDetails.expYear || !cardDetails.cvc) {
      toast({
        title: "Missing information",
        description: "Please fill out all card details.",
        variant: "destructive"
      });
      return;
    }
    
    // Create a new payment method entry
    const newCard = {
      id: `pm_${Date.now()}`,
      brand: getCardBrand(cardDetails.cardNumber),
      last4: cardDetails.cardNumber.slice(-4),
      expMonth: parseInt(cardDetails.expMonth),
      expYear: parseInt(cardDetails.expYear),
    };
    
    setPaymentMethods(prev => [...prev, newCard]);
    
    // If this is the first card, set it as default
    if (paymentMethods.length === 0) {
      setDefaultPaymentMethod(newCard.id);
    }
    
    toast({
      title: "Card added",
      description: "Your payment method has been added successfully.",
    });
    
    // Reset form and close dialog
    setCardDetails({
      cardNumber: "",
      expMonth: "",
      expYear: "",
      cvc: ""
    });
    setIsAddCardOpen(false);
  };

  const handleRemoveCard = (id: string) => {
    // Remove the card
    setPaymentMethods(prev => prev.filter(card => card.id !== id));
    
    // If we removed the default card, set a new default (if any cards remain)
    if (id === defaultPaymentMethod && paymentMethods.length > 1) {
      // Find the first card that's not the one we're removing
      const nextCard = paymentMethods.find(card => card.id !== id);
      if (nextCard) {
        setDefaultPaymentMethod(nextCard.id);
      } else {
        setDefaultPaymentMethod("");
      }
    }
    
    toast({
      title: "Card removed",
      description: "Your payment method has been removed.",
    });
  };

  const handleSetDefault = (id: string) => {
    setDefaultPaymentMethod(id);
    toast({
      title: "Default updated",
      description: "Your default payment method has been updated.",
    });
  };

  // Simple function to guess card brand based on first digits
  const getCardBrand = (cardNumber: string): string => {
    const firstDigit = cardNumber.charAt(0);
    
    if (firstDigit === "4") return "visa";
    if (firstDigit === "5") return "mastercard";
    if (firstDigit === "3") return "amex";
    if (firstDigit === "6") return "discover";
    
    return "card";
  };

  return (
    <AdminLayout title="Payment Methods">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Payment Methods</h1>
          <Button onClick={() => setIsAddCardOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Shipping Payment Cards</h2>
          {paymentMethods.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map(card => (
                <PaymentMethodCard
                  key={card.id}
                  card={card}
                  isDefault={card.id === defaultPaymentMethod}
                  onRemove={handleRemoveCard}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-md">
              <CreditCard className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">
                No payment methods added yet.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddCardOpen(true)}
              >
                Add your first payment method
              </Button>
            </div>
          )}
        </div>

        <div className="bg-muted/20 rounded-md p-6">
          <h2 className="text-lg font-semibold mb-2">About Payment Methods</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Payment methods are used to pay for shipping costs when fulfilling orders.
            Your card will be charged only when you initiate a shipping label purchase.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="link" 
              className="h-auto p-0"
              onClick={() => 
                toast({
                  title: "Coming soon",
                  description: "This feature will be available when Stripe integration is complete.",
                })
              }
            >
              View billing history
            </Button>
          </div>
        </div>
      </div>

      {/* Add Card Dialog */}
      <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new card to pay for shipping costs.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                name="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={cardDetails.cardNumber}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expMonth">Month</Label>
                <Input
                  id="expMonth"
                  name="expMonth"
                  placeholder="MM"
                  value={cardDetails.expMonth}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expYear">Year</Label>
                <Input
                  id="expYear"
                  name="expYear"
                  placeholder="YYYY"
                  value={cardDetails.expYear}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  name="cvc"
                  placeholder="123"
                  value={cardDetails.cvc}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard}>
              Add Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}