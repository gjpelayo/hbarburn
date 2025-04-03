import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ItemVariation, InsertItemVariation, ItemVariantStock } from "@shared/schema";

interface ItemVariationManagerProps {
  physicalItemId: number;
  onVariationsChange?: () => void;
}

export function ItemVariationManager({ physicalItemId, onVariationsChange }: ItemVariationManagerProps) {
  const [variations, setVariations] = useState<ItemVariation[]>([]);
  const [variantStocks, setVariantStocks] = useState<ItemVariantStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddVariationOpen, setIsAddVariationOpen] = useState(false);
  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [selectedVariantStockId, setSelectedVariantStockId] = useState<number | null>(null);
  const [newVariation, setNewVariation] = useState<{ name: string; options: string[] }>({
    name: "",
    options: [""],
  });
  const [newStock, setNewStock] = useState<number>(0);

  const fetchVariations = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest("GET", `/api/physical-items/${physicalItemId}/variations`);
      const data = await res.json();
      setVariations(data);
    } catch (error) {
      console.error("Failed to fetch variations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch item variations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVariantStocks = async () => {
    try {
      const res = await apiRequest("GET", `/api/physical-items/${physicalItemId}/variant-stocks`);
      const data = await res.json();
      setVariantStocks(data);
    } catch (error) {
      console.error("Failed to fetch variant stocks:", error);
    }
  };

  useEffect(() => {
    if (physicalItemId) {
      fetchVariations();
      fetchVariantStocks();
    }
  }, [physicalItemId]);

  const handleAddOption = () => {
    setNewVariation({
      ...newVariation,
      options: [...newVariation.options, ""],
    });
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...newVariation.options];
    updatedOptions.splice(index, 1);
    setNewVariation({
      ...newVariation,
      options: updatedOptions,
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newVariation.options];
    updatedOptions[index] = value;
    setNewVariation({
      ...newVariation,
      options: updatedOptions,
    });
  };

  const handleAddVariation = async () => {
    if (!newVariation.name) {
      toast({
        title: "Error",
        description: "Variation name is required",
        variant: "destructive",
      });
      return;
    }

    if (newVariation.options.some(option => !option)) {
      toast({
        title: "Error",
        description: "All options must have a value",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const variationData: InsertItemVariation = {
        physicalItemId,
        name: newVariation.name,
        options: newVariation.options,
      };

      const res = await apiRequest("POST", `/api/physical-items/${physicalItemId}/variations`, variationData);
      const data = await res.json();

      // Create variant stock combinations
      const existingVariations = [...variations, data];
      const combinations = generateCombinations(existingVariations);
      
      for (const combination of combinations) {
        if (!variantStocks.some(vs => vs.combination === combination)) {
          await apiRequest("POST", `/api/physical-items/${physicalItemId}/variant-stocks`, {
            physicalItemId,
            combination,
            stock: 0,
          });
        }
      }

      toast({
        title: "Success",
        description: "Variation added successfully",
      });
      
      setNewVariation({ name: "", options: [""] });
      setIsAddVariationOpen(false);
      
      await fetchVariations();
      await fetchVariantStocks();
      
      if (onVariationsChange) {
        onVariationsChange();
      }
    } catch (error) {
      console.error("Failed to add variation:", error);
      toast({
        title: "Error",
        description: "Failed to add variation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVariation = async (variationId: number) => {
    if (!confirm("Are you sure you want to delete this variation? This will also delete all associated variant stocks.")) {
      return;
    }

    try {
      setIsLoading(true);
      await apiRequest("DELETE", `/api/physical-items/${physicalItemId}/variations/${variationId}`);
      
      toast({
        title: "Success",
        description: "Variation deleted successfully",
      });
      
      await fetchVariations();
      await fetchVariantStocks();
      
      if (onVariationsChange) {
        onVariationsChange();
      }
    } catch (error) {
      console.error("Failed to delete variation:", error);
      toast({
        title: "Error",
        description: "Failed to delete variation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    if (selectedVariantStockId === null) return;

    try {
      setIsLoading(true);
      await apiRequest("PATCH", `/api/physical-items/${physicalItemId}/variant-stocks/${selectedVariantStockId}`, { stock: newStock });
      
      toast({
        title: "Success",
        description: "Stock updated successfully",
      });
      
      setIsEditStockOpen(false);
      setSelectedVariantStockId(null);
      await fetchVariantStocks();
      
      if (onVariationsChange) {
        onVariationsChange();
      }
    } catch (error) {
      console.error("Failed to update stock:", error);
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditStock = (variantStockId: number, currentStock: number) => {
    setSelectedVariantStockId(variantStockId);
    setNewStock(currentStock);
    setIsEditStockOpen(true);
  };

  // Utility function to generate all possible combinations of options
  const generateCombinations = (variations: ItemVariation[]): string[] => {
    if (variations.length === 0) return [];
    
    const result: string[] = [];
    const generateHelper = (current: string, level: number) => {
      if (level === variations.length) {
        result.push(current.trim());
        return;
      }
      
      const variation = variations[level];
      for (const option of variation.options) {
        const prefix = current ? `${current} / ` : '';
        generateHelper(`${prefix}${variation.name}: ${option}`, level + 1);
      }
    };
    
    generateHelper('', 0);
    return result;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Item Variations</h3>
        <Dialog open={isAddVariationOpen} onOpenChange={setIsAddVariationOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Variation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Item Variation</DialogTitle>
              <DialogDescription>
                Add a new variation type (like Size, Color, etc.) and its options.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="variation-name">Variation Name</Label>
                <Input
                  id="variation-name"
                  placeholder="e.g. Size, Color, Material"
                  value={newVariation.name}
                  onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label>Options</Label>
                {newVariation.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      disabled={newVariation.options.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleAddVariation}
                disabled={isLoading}
              >
                {isLoading ? "Adding..." : "Add Variation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {variations.length > 0 ? (
        <div className="space-y-4">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variation</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variations.map((variation) => (
                  <TableRow key={variation.id}>
                    <TableCell className="font-medium">{variation.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {variation.options.map((option, i) => (
                          <Badge key={i} variant="outline">
                            {option}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVariation(variation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <h3 className="text-lg font-medium mt-6">Inventory by Variation</h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Combination</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantStocks.map((variantStock) => (
                  <TableRow key={variantStock.id}>
                    <TableCell>{variantStock.combination}</TableCell>
                    <TableCell className="text-right">
                      {variantStock.stock === 0 ? (
                        <span className="text-red-500">Out of stock</span>
                      ) : (
                        <span className="text-green-500">{variantStock.stock}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditStock(variantStock.id, variantStock.stock)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <p className="text-muted-foreground">No variations added yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add variations like Size, Color, or Material to track inventory more precisely.
          </p>
        </div>
      )}

      <Dialog open={isEditStockOpen} onOpenChange={setIsEditStockOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Enter the new stock quantity for this variation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="stock-quantity">Stock Quantity</Label>
              <Input
                id="stock-quantity"
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleUpdateStock}
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}