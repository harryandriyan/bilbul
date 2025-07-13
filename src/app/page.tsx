'use client'

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {useState, useCallback, useEffect, lazy} from 'react';
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
import {Copy, Pencil, ArrowRight, Check, Sparkles} from "lucide-react";
import {useAuth} from '@/contexts/auth-context';
import {useNavigate} from 'react-router-dom';
import {Header} from '@/components/ui/header';
import {motion, AnimatePresence} from "framer-motion";
import {ChevronLeft, ChevronRight, Sun, Moon} from "lucide-react";
import {useTheme} from '@/contexts/theme-context';
import {useIsMobile} from '@/hooks/use-is-mobile';

const ReactConfetti = lazy(() => import('react-confetti'));

const formSchema = z.object({
  numberOfPeople: z.number().min(1, {message: "Number of people must be at least 1"}).max(5, {message: "Number of people cannot exceed 5"}),
})

const numberOfPeopleOptions = [2, 3, 4, 5];

type Person = {
  id: number;
  name: string;
  items: {itemId: number; quantity: number}[];
}

const features = [
  {
    title: "Smart Receipt Scanning",
    description: "AI-powered receipt scanning that accurately detects items and prices",
    icon: Sparkles,
  },
  {
    title: "Fair Split Algorithm",
    description: "Intelligent algorithm that suggests the fairest way to split the bill",
    icon: Check,
  },
  {
    title: "Easy Sharing",
    description: "Share split results instantly with friends via text or email",
    icon: ArrowRight,
  },
]

const pricing = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for occasional use",
    features: [
      "3 splits per day",
      "Basic receipt scanning",
      "Simple sharing",
    ],
    cta: "Get Started",
  },
  {
    name: "Premium",
    price: "$2.99",
    period: "/month",
    description: "For power users and groups",
    features: [
      "Unlimited splits",
      "Friend list management",
      "Split history",
      "Advanced receipt scanning",
      "Priority support",
    ],
    cta: "Upgrade Now",
    highlight: true,
  },
]

const HowItWorksSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    '/how-it-works-1.png',
    '/how-it-works-2.png',
    '/how-it-works-3.png'
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.3}}
            className="absolute inset-0"
          >
            <img
              src={slides[currentSlide]}
              alt={`How it works step ${currentSlide + 1}`}
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="absolute bottom-4 items-center left-4 right-4 flex justify-between">
        <Button
          variant="secondary"
          size="icon"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={nextSlide}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default function Home() {
  const {user, loading: authLoading} = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editedItems, setEditedItems] = useState<{[key: number]: {name: string; price: number}}>({});
  const [hasSplitBill, setHasSplitBill] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  const [showOnlyResult, setShowOnlyResult] = useState(false);

  // Add smooth scrolling behavior
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

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
      navigate('/auth');
    }
  }, [user, authLoading, navigate, hasSplitBill]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeStep === 3 && suggestedSplit) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000); // Show confetti for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [activeStep, suggestedSplit]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Check if user is logged in or hasn't used split bill yet
    if (!user && hasSplitBill) {
      toast({
        title: "Sign in required",
        description: "Please sign in to continue using Bilbul.",
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
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

      const response = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({photoUrl: imageUrl}),
      });
      const extractedData = await response.json();

      // Handle errors if !response.ok
      if (!response.ok) {
        throw new Error("Could not extract receipt data. Please try again.");
      }

      // Validate the extracted data
      if (!extractedData?.items?.length || !extractedData.totalAmount) {
        throw new Error("Could not extract valid receipt data. Please make sure you uploaded a clear receipt image.");
      }

      // Validate items have valid prices and quantities
      const hasInvalidItems = extractedData.items.some((item: any) =>
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
      extractedData.items.forEach((item: any, index: number) => {
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

  const onSuggestSplit = async (numberOfPeople: number) => {
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
      const response = await fetch('/api/suggest-split', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({receiptData: receiptDataString, numberOfPeople}),
      });
      const splitSuggestion = await response.json();
      setSuggestedSplit(splitSuggestion.suggestedSplit);
      setShowOnlyResult(true);
      toast({
        title: "Split suggested successfully!",
        description: "Check the suggested split below.",
      });
      setActiveStep(3);
    } catch (error: any) {
      console.error("Error suggesting split:", error);
      toast({
        variant: "destructive",
        title: "Error suggesting split.",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

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
    setShowOnlyResult(true);
    toast({
      title: "Advanced split confirmed!",
      description: "Check the suggested advanced split below.",
    });
    setActiveStep(3);
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

  const renderMobileOnlyMessage = () => {
    if (!isMobile) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">Manual Upload</CardTitle>
            <CardDescription>Upload your receipt image manually. For the best experience with receipt scanning, please use a mobile device.</CardDescription>
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
      );
    }
    return null;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-medium tracking-tighter sm:text-4xl">How It Works</h2>
                  <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                    Split bills in three simple steps
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      1
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">Upload Receipt</h3>
                      <p className="text-gray-500 dark:text-gray-400">Take a photo or upload your receipt</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">Review Items</h3>
                      <p className="text-gray-500 dark:text-gray-400">Our AI detects all items and prices</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      3
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">Split Bill</h3>
                      <p className="text-gray-500 dark:text-gray-400">Choose how to split the bill between people</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                {renderMobileOnlyMessage()}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
