'use server';

/**
 * @fileOverview Extracts data from a receipt image using AI.
 *
 * - extractReceiptData - A function that handles the receipt data extraction process.
 * - ExtractReceiptDataInput - The input type for the extractReceiptData function.
 * - ExtractReceiptDataOutput - The return type for the extractReceiptData function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ExtractReceiptDataInputSchema = z.object({
  photoUrl: z.string().describe('The URL of the receipt image.'),
});
export type ExtractReceiptDataInput = z.infer<typeof ExtractReceiptDataInputSchema>;

const ExtractReceiptDataOutputSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe('The name of the item.'),
      price: z.number().describe('The price of the item.'),
      quantity: z.number().describe('The quantity of the item.'),
    })
  ).describe('The list of items on the receipt.'),
  totalAmount: z.number().describe('The total amount on the receipt.'),
});
export type ExtractReceiptDataOutput = z.infer<typeof ExtractReceiptDataOutputSchema>;

export async function extractReceiptData(input: ExtractReceiptDataInput): Promise<ExtractReceiptDataOutput> {
  return extractReceiptDataFlow(input);
}

const extractReceiptDataPrompt = ai.definePrompt({
  name: 'extractReceiptDataPrompt',
  input: {
    schema: z.object({
      photoUrl: z.string().describe('The URL of the receipt image.'),
    }),
  },
  output: {
    schema: z.object({
      items: z.array(
        z.object({
          name: z.string().describe('The name of the item.'),
          price: z.number().describe('The price of the item.'),
          quantity: z.number().describe('The quantity of the item.'),
        })
      ).describe('The list of items on the receipt.'),
      totalAmount: z.number().describe('The total amount on the receipt.'),
    }),
  },
  prompt: `You are an expert receipt data extractor.

You will receive a receipt image and you will extract the items, prices, and total amount from the receipt. For each item, extract also the quantity.

Here is the receipt image: {{media url=photoUrl}}

Return the data in a JSON format.`,
});

const extractReceiptDataFlow = ai.defineFlow<
  typeof ExtractReceiptDataInputSchema,
  typeof ExtractReceiptDataOutputSchema
>({
  name: 'extractReceiptDataFlow',
  inputSchema: ExtractReceiptDataInputSchema,
  outputSchema: ExtractReceiptDataOutputSchema,
}, async input => {
  try {
    const {output} = await extractReceiptDataPrompt(input);

    if (!output) {
      throw new Error("Failed to extract receipt data. Please make sure you uploaded a clear receipt image.");
    }

    // Validate the output
    if (!output.items || !Array.isArray(output.items) || output.items.length === 0) {
      throw new Error("No items found in the receipt. Please make sure you uploaded a clear receipt image.");
    }

    if (typeof output.totalAmount !== 'number' || output.totalAmount <= 0) {
      throw new Error("Invalid total amount. Please make sure you uploaded a clear receipt image.");
    }

    // Validate each item
    for (const item of output.items) {
      if (!item.name || typeof item.price !== 'number' || item.price <= 0 || typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error("Invalid item data detected. Please make sure you uploaded a clear receipt image.");
      }
    }

    return output;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to process the receipt image. Please try again with a clearer image.");
  }
});
