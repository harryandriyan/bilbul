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
import {Copy, Pencil, ArrowRight, Check, Sparkles} from "lucide-react";
import {useAuth} from '@/contexts/auth-context';
import {useRouter} from 'next/navigation';
import {Header} from '@/components/ui/header';
import dynamic from 'next/dynamic';
import {motion, AnimatePresence} from "framer-motion";
import Link from "next/link"
import Image from "next/image"
import {ChevronLeft, ChevronRight, Sun, Moon} from "lucide-react";
import {useTheme} from '@/contexts/theme-context';

const ReactConfetti = dynamic(() => import('react-confetti'), {
  ssr: false
});

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
            <Image
              src={slides[currentSlide]}
              alt={`How it works step ${currentSlide + 1}`}
              fill
              className="object-cover"
              priority
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
  const router = useRouter();
  const {theme, toggleTheme} = useTheme();
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
      router.push('/auth');
    }
  }, [user, authLoading, router, hasSplitBill]);

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
      const {suggestSplit} = await import('@/ai/flows/suggest-split');
      const splitSuggestion = await suggestSplit({receiptData: receiptDataString, numberOfPeople: numberOfPeople});
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="w-full border-b">
        <div className="container flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.png"
              alt="Bilbul Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-medium text-xl">Bilbul</span>
          </Link>
          <div className="ml-auto flex items-center space-x-4">
            <Link href="#pricing" scroll={true} className="scroll-smooth">
              <Button variant="ghost">Pricing</Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {user ? (
              <Link href="/app">
                <Button variant="outline" className="flex items-center gap-2">
                  <Image
                    src={user.photoURL ?? "/default-avatar.png"}
                    alt="User avatar"
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span>Dashboard</span>
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button>Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 dark:from-primary/10 dark:to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_50%,rgba(0,0,0,0.1)_100%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_50%,rgba(255,255,255,0.1)_100%)]" />
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              ],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <motion.h1
                className="text-3xl font-medium tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 dark:from-primary/90 dark:to-primary/40">
                  Split Bills Fairly with <span className="text-secondary">AI</span>
                </span>
              </motion.h1>
              <motion.p
                className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5, delay: 0.2}}
              >
                Upload a receipt and let our AI handle the rest. No more arguments about who owes what.
              </motion.p>
            </div>
            <motion.div
              className="space-x-4"
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.5, delay: 0.4}}
            >
              <Link href="/app">
                <Button size="lg" className="relative group">
                  <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300" />
                  <span className="relative">Try it Free</span>
                </Button>
              </Link>
              <Button variant="secondary" size="lg">Learn More</Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-900">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-medium tracking-tighter sm:text-4xl">Why Choose Bilbul?</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Our AI-powered platform makes bill splitting effortless and fair.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-12">
            {features.map((feature) => (
              <Card key={feature.title} className="flex flex-col items-center p-6 text-center">
                <feature.icon className="h-12 w-12 mb-4" />
                <CardHeader>
                  <CardTitle className="font-medium">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
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
                    <h3 className="text-xl font-medium">Split & Share</h3>
                    <p className="text-gray-500 dark:text-gray-400">Get fair split suggestions and share with friends</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <HowItWorksSlider />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-900" id="pricing">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-medium tracking-tighter sm:text-4xl">Simple, Transparent Pricing</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Choose the plan that's right for you
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:gap-12 mt-12">
            {pricing.map((plan) => (
              <Card key={plan.name} className={`flex flex-col ${plan.highlight ? 'border-primary' : ''}`}>
                <CardHeader>
                  <CardTitle className="font-medium">{plan.name}</CardTitle>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-medium">{plan.price}</span>
                    {plan.period && <span className="text-gray-500">{plan.period}</span>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="mr-2 h-4 w-4" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6">
                  <Button className="w-full" variant={plan.highlight ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-medium tracking-tighter sm:text-4xl">Ready to Get Started?</h2>
              <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Join thousands of users who are splitting bills the smart way.
              </p>
            </div>
            <div className="space-x-4">
              <Link href="/app">
                <Button size="lg">Try it Free</Button>
              </Link>
              <Button variant="outline" size="lg">Contact Sales</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
