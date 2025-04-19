'use client'

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {useState, useCallback, useEffect} from 'react';
import {extractReceiptData} from '@/ai/flows/extract-receipt-data';
import type {ExtractReceiptDataOutput} from '@/ai/flows/extract-receipt-data';
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import {zodResolver} from "@hookform/resolvers/zod"
import * as z from "zod"
import {useForm} from "react-hook-form"
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from "@/components/ui/alert-dialog";
import {Icons} from "@/components/icons";
import {toast} from "@/hooks/use-toast";
import {Toaster} from "@/components/ui/toaster";
import {useDropzone} from 'react-dropzone';
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Copy, Moon, Sun} from "lucide-react";
import {useAuth} from '@/contexts/auth-context';
import {useRouter} from 'next/navigation';
import {Header} from '@/components/ui/header';

const formSchema = z.object({
  numberOfPeople: z.number().min(1, {message: "Number of people must be at least 1"}).max(5, {message: "Number of people cannot exceed 5"}),
})

const numberOfPeopleOptions = [2, 3, 4, 5];

type Person = {
  id: number;
  name: string;
  items: {itemId: number; quantity: number}[];
}

export default function Home() {
  const {user, loading: authLoading} = useAuth();
  const router = useRouter();
  const [receiptData, setReceiptData] = useState<ExtractReceiptDataOutput | null>(null);
  const [suggestedSplit, setSuggestedSplit] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [assignedItems, setAssignedItems] = useState<{itemId: number; personId: number; quantity: number}[]>([]);
  const [isAdvancedSplitDone, setIsAdvancedSplitDone] = useState(false);
  const [remainingQuantities, setRemainingQuantities] = useState<{[itemId: number]: number}>({});
  const [activeStep, setActiveStep] = useState(0); // 0: initial, 1: receipt details, 2: split options, 3: advanced split
  const [isReceiptDataExtracted, setIsReceiptDataExtracted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editedItems, setEditedItems] = useState<{[key: number]: {name: string; price: number}}>({});
  const [hasSplitBill, setHasSplitBill] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numberOfPeople: 1,
    },
  })

  useEffect(() => {
    // Check if user has already split a bill
    const hasUsedSplitBill = localStorage.getItem('hasUsedSplitBill');
    if (hasUsedSplitBill) {
      setHasSplitBill(true);
    }
  }, []);

  useEffect(() => {
    // Only redirect if user has already used split bill once
    if (!authLoading && !user && hasSplitBill) {
      router.push('/auth');
    }
  }, [user, authLoading, router, hasSplitBill]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Check if user is logged in or hasn't used split bill yet
    if (!user && hasSplitBill) {
      toast({
        title: "Sign in required",
        description: "Please sign in to continue using Bilbul.",
        action: (
          <Button variant="outline" size="sm" onClick={() => router.push('/auth')}>
            Sign in
          </Button>
        ),
      });
      return;
    }

    setLoading(true);
    setPeople(Array.from({length: values.numberOfPeople}, (_, i) => ({
      id: i + 1,
      name: `Person ${i + 1}`,
      items: [],
    })));
    try {
      if (!imageUrl) {
        toast({
          variant: "destructive",
          title: "Error extracting receipt data.",
          description: "Please upload a receipt image.",
        });
        setLoading(false);
        return;
      }

      const extractedData = await extractReceiptData({photoUrl: imageUrl});

      // Validate the extracted data
      if (!extractedData?.items?.length || !extractedData.totalAmount) {
        throw new Error("Could not extract valid receipt data. Please make sure you uploaded a clear receipt image.");
      }

      // Validate items have valid prices and quantities
      const hasInvalidItems = extractedData.items.some(item =>
        !item.name ||
        typeof item.price !== 'number' ||
        item.price <= 0 ||
        typeof item.quantity !== 'number' ||
        item.quantity <= 0
      );

      if (hasInvalidItems) {
        throw new Error("Invalid receipt data detected. Please make sure you uploaded a clear receipt image.");
      }

      setReceiptData(extractedData);

      // Initialize remaining quantities
      const initialRemainingQuantities: {[itemId: number]: number} = {};
      extractedData.items.forEach((item, index) => {
        initialRemainingQuantities[index] = item.quantity;
      });
      setRemainingQuantities(initialRemainingQuantities);
      setAssignedItems([]);
      setIsAdvancedSplitDone(false);
      setIsReceiptDataExtracted(true);

      // Mark that user has used split bill if not logged in
      if (!user) {
        localStorage.setItem('hasUsedSplitBill', 'true');
        setHasSplitBill(true);
      }

      toast({
        title: "Receipt data extracted successfully!",
        description: "Check the receipt details below.",
      })
      setActiveStep(1); // Move to receipt details step
    } catch (error: any) {
      console.error("Error extracting receipt data:", error);
      toast({
        variant: "destructive",
        title: "Error extracting receipt data.",
        description: error.message || "Please make sure you uploaded a clear receipt image.",
      })
      setReceiptData(null);
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  }

  async function onSuggestSplit(numberOfPeople: number) {
    if (!receiptData) {
      toast({
        variant: "destructive",
        title: "Error suggesting split.",
        description: "Please extract receipt data first.",
      });
      return;
    }
    setLoading(true);
    try {
      const receiptDataString = JSON.stringify(receiptData);
      const {suggestSplit} = await import('@/ai/flows/suggest-split');
      const splitSuggestion = await suggestSplit({receiptData: receiptDataString, numberOfPeople: numberOfPeople});
      setSuggestedSplit(splitSuggestion.suggestedSplit);
      toast({
        title: "Split suggested successfully!",
        description: "Check the suggested split below.",
      })
      setActiveStep(3); // Move to the final step to show the result.
    } catch (error: any) {
      console.error("Error suggesting split:", error);
      toast({
        variant: "destructive",
        title: "Error suggesting split.",
        description: error.message,
      })
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImageUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  }, []);
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, accept: {'image/*': ['.jpeg', '.png', '.jpg']}})

  const handleItemAssignment = (personId: number, itemId: number, quantity: number) => {
    if (quantity > (remainingQuantities[itemId] || 0)) {
      toast({
        variant: "destructive",
        title: "Error assigning item.",
        description: `Quantity exceeds remaining for item ${receiptData?.items[itemId].name}.`,
      });
      return;
    }

    setAssignedItems(prev => {
      // Check if the item is already assigned to this person
      const existingAssignmentIndex = prev.findIndex(
        assignment => assignment.personId === personId && assignment.itemId === itemId
      );

      if (existingAssignmentIndex !== -1) {
        // Update existing assignment
        const updatedAssignments = [...prev];
        updatedAssignments[existingAssignmentIndex].quantity = quantity;
        return updatedAssignments;
      } else {
        return [...prev, {personId, itemId, quantity}];
      }
    });

    setRemainingQuantities(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) - quantity,
    }));
  };

  const handleStartOver = () => {
    // Reset all form values
    form.reset({
      numberOfPeople: 1,
    });
    // Reset all state
    setActiveStep(0);
    setReceiptData(null);
    setSuggestedSplit(null);
    setPeople([]);
    setAssignedItems([]);
    setIsAdvancedSplitDone(false);
    setRemainingQuantities({});
    setIsReceiptDataExtracted(false);
    setImageUrl(null);
  };

  const handleDone = () => {
    // Verify if all items are assigned
    let allAssigned = true;
    for (const itemId in remainingQuantities) {
      if ((remainingQuantities[itemId] || 0) > 0) {
        allAssigned = false;
        break;
      }
    }

    if (!allAssigned) {
      toast({
        variant: "destructive",
        title: "Error confirming split.",
        description: "Please assign all items before confirming.",
      });
      return;
    }

    setIsAdvancedSplitDone(true);
    toast({
      title: "Items assigned successfully!",
      description: "You can now confirm the advanced split.",
    });
    setActiveStep(2); // Move to receipt details step
  };

  const confirmAdvancedSplit = () => {
    // Process and display the split
    let splitSummary = "";
    people.forEach(person => {
      const personTotal = calculatePersonTotal(person.id);
      splitSummary += `${person.name}: $${personTotal.toFixed(2)}\n`;
      assignedItems.forEach(assignment => {
        if (assignment.personId === person.id) {
          const item = receiptData?.items[assignment.itemId];
          if (item) {
            splitSummary += `  ${assignment.quantity} x ${item.name}\n`;
          }
        }
      });
    });

    setSuggestedSplit(splitSummary);
    toast({
      title: "Advanced split confirmed!",
      description: "Check the suggested advanced split below.",
    });
    setActiveStep(3); // Move to the final step to show the result.
  };

  const copyToClipboard = () => {
    if (suggestedSplit) {
      navigator.clipboard.writeText(suggestedSplit)
        .then(() => {
          toast({
            title: "Copied to clipboard!",
            description: "The split result has been copied to your clipboard.",
          });
        })
        .catch(err => {
          toast({
            variant: "destructive",
            title: "Copy failed!",
            description: "Failed to copy the split result to your clipboard.",
          });
        });
    }
  };

  const updatePersonName = (personId: number, newName: string) => {
    setPeople(prevPeople =>
      prevPeople.map(person =>
        person.id === personId ? {...person, name: newName} : person
      )
    );
  };

  const calculatePersonTotal = (personId: number): number => {
    let personTotal = 0;
    assignedItems.forEach(assignment => {
      if (assignment.personId === personId) {
        const item = receiptData?.items[assignment.itemId];
        if (item) {
          const itemCost = (item.price / item.quantity) * assignment.quantity;
          personTotal += itemCost;
        }
      }
    });
    return personTotal;
  };

  const handleEditItem = (index: number) => {
    setEditingItem(index);
    if (!editedItems[index]) {
      setEditedItems(prev => ({
        ...prev,
        [index]: {
          name: receiptData?.items[index].name || '',
          price: receiptData?.items[index].price || 0
        }
      }));
    }
  };

  const handleSaveEdit = (index: number) => {
    if (!receiptData) return;

    const updatedItems = [...receiptData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      name: editedItems[index].name,
      price: editedItems[index].price
    };

    setReceiptData({
      ...receiptData,
      items: updatedItems
    });
    setEditingItem(null);
  };

  const handleCancelEdit = (index: number) => {
    setEditingItem(null);
    setEditedItems(prev => {
      const newEditedItems = {...prev};
      delete newEditedItems[index];
      return newEditedItems;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-screen py-4 px-4 bg-background">
          <Toaster />
          <div className="w-full max-w-sm">

            {/* Step Indicator */}
            <div className="flex justify-between items-center mb-6">
              {[0, 1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                    {step + 1}
                  </div>
                  <span className="text-xs mt-1 text-center">
                    {step === 0 ? 'Upload' : step === 1 ? 'Details' : step === 2 ? 'Split' : 'Result'}
                  </span>
                </div>
              ))}
            </div>

            {activeStep === 0 && (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-lg">Upload Receipt</CardTitle>
                  <CardDescription>Upload the receipt image and select number of people</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <div className="space-y-4">
                      <FormItem>
                        <FormLabel>Receipt Image</FormLabel>
                        <FormControl>
                          <div {...getRootProps()} className="dropzone rounded-md border-2 border-dashed p-4 cursor-pointer">
                            <input {...getInputProps()} />
                            {isDragActive ? (
                              <p className="text-sm text-center">Drop the files here ...</p>
                            ) : (
                              <p className="text-sm text-center">Drag 'n' drop or click to select</p>
                            )}
                            {imageUrl && (
                              <img
                                src={imageUrl}
                                alt="Uploaded Receipt"
                                className="mt-4 rounded-md max-h-32 object-contain mx-auto"
                              />
                            )}
                          </div>
                        </FormControl>
                      </FormItem>
                      {imageUrl &&
                        <FormItem>
                          <FormLabel>Number of People</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-2">
                              {numberOfPeopleOptions.map((number) => (
                                <Button
                                  key={number}
                                  type="button"
                                  variant={form.watch("numberOfPeople") === number ? "default" : "outline"}
                                  onClick={() => form.setValue("numberOfPeople", number)}
                                  className="w-full"
                                >
                                  {number} People
                                </Button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      }
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Button
                          type="submit"
                          disabled={loading || !imageUrl}
                          className="w-full"
                        >
                          {loading && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                          Extract Receipt
                        </Button>
                      </form>
                    </div>
                  </Form>
                </CardContent>
              </Card>
            )}

            {activeStep >= 1 && receiptData && (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-lg">Receipt Details</CardTitle>
                  <CardDescription>Review and edit the extracted items if needed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {receiptData?.items?.map((item, index) => (
                    <div key={index} className="flex flex-col gap-2 py-2 border-b">
                      {editingItem === index ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={editedItems[index]?.name || ''}
                              onChange={(e) => setEditedItems(prev => ({
                                ...prev,
                                [index]: {...prev[index], name: e.target.value}
                              }))}
                              className="flex-1"
                              placeholder="Item name"
                            />
                            <Input
                              type="number"
                              value={editedItems[index]?.price || 0}
                              onChange={(e) => setEditedItems(prev => ({
                                ...prev,
                                [index]: {...prev[index], price: parseFloat(e.target.value)}
                              }))}
                              className="w-24"
                              placeholder="Price"
                              step="0.01"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(index)}
                              className="flex-1"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelEdit(index)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(index)}
                              className="h-6 w-6 p-0"
                            >
                              <Icons.pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-medium">${item.price.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 font-bold">
                    <span>Total</span>
                    <span>${receiptData?.totalAmount?.toFixed(2)}</span>
                  </div>
                  {activeStep === 1 && (
                    <Button onClick={() => setActiveStep(2)} className="w-full mt-4">
                      Next: Split Options
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {activeStep >= 2 && receiptData && (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-lg">Split Options</CardTitle>
                  <CardDescription>Choose how to split the bill</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="simple" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="simple">Simple</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>
                    <TabsContent value="simple" className="space-y-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button disabled={loading} className="w-full">
                            {loading && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                            Suggest Split
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Suggest Split</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to suggest split for {form.getValues().numberOfPeople} people?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onSuggestSplit(form.getValues().numberOfPeople)}>Confirm</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="secondary"
                        onClick={handleStartOver}
                        className="w-full"
                      >
                        Start Over
                      </Button>
                    </TabsContent>
                    <TabsContent value="advanced" className="space-y-4">
                      <Form {...form}>
                        {people.map((person) => (
                          <FormItem key={person.id}>
                            <FormLabel htmlFor={`person-${person.id}-name`}>
                              {`Person ${person.id} Name`}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                id={`person-${person.id}-name`}
                                value={person.name}
                                onChange={(e) => updatePersonName(person.id, e.target.value)}
                              />
                            </FormControl>
                          </FormItem>
                        ))}
                      </Form>
                      <div className="space-y-4">
                        {receiptData?.items?.map((item: ExtractReceiptDataOutput['items'][0], index: number) => (
                          <div key={index} className="flex flex-col gap-2 p-3 border rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {remainingQuantities[index] !== undefined ? remainingQuantities[index] : item.quantity} left
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {people.map(person => {
                                const isAssigned = assignedItems.some(
                                  assignment => assignment.personId === person.id && assignment.itemId === index
                                );
                                return (
                                  <Button
                                    key={person.id}
                                    onClick={() => {
                                      const quantity = 1;
                                      handleItemAssignment(person.id, index, quantity);
                                    }}
                                    disabled={!isReceiptDataExtracted || isAdvancedSplitDone || (remainingQuantities[index] === undefined || remainingQuantities[index] <= 0)}
                                    variant={isAssigned ? "default" : "outline"}
                                    size="sm"
                                    className="w-full"
                                  >
                                    {person.name}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <Button onClick={handleDone} disabled={isAdvancedSplitDone} className="w-full">
                          {isAdvancedSplitDone ? "Done" : "Mark as Done"}
                        </Button>
                        {isAdvancedSplitDone && (
                          <Button onClick={confirmAdvancedSplit} className="w-full">
                            Confirm Advanced Split
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={handleStartOver}
                          className="w-full"
                        >
                          Start Over
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {activeStep === 3 && suggestedSplit && (
              <Card className="w-full border-2 border-primary/20 shadow-lg">
                <CardHeader className="bg-primary/5 dark:bg-primary/10 rounded-t-lg">
                  <CardTitle className="text-xl font-bold">Split Result</CardTitle>
                  <CardDescription>Here's how the bill is split</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="relative">
                    <Textarea
                      readOnly
                      value={suggestedSplit}
                      className="min-h-[200px] font-nunito text-base bg-background/50 dark:bg-background/80"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 hover:bg-primary/10"
                      onClick={copyToClipboard}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
