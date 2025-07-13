'use server';
/**
 * @fileOverview Suggests a fair split of the bill based on the extracted receipt data and the number of people involved.
 *
 * - suggestSplit - A function that suggests a fair split of the bill.
 * - SuggestSplitInput - The input type for the suggestSplit function.
 * - SuggestSplitOutput - The return type for the suggestSplit function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'zod';

const SuggestSplitInputSchema = z.object({
  receiptData: z.string().describe('The extracted receipt data.'),
  numberOfPeople: z.number().describe('The number of people involved in the bill split.'),
});
export type SuggestSplitInput = z.infer<typeof SuggestSplitInputSchema>;

const SuggestSplitOutputSchema = z.object({
  suggestedSplit: z.string().describe('The suggested split of the bill for each person.'),
});
export type SuggestSplitOutput = z.infer<typeof SuggestSplitOutputSchema>;

export async function suggestSplit(input: SuggestSplitInput): Promise<SuggestSplitOutput> {
  return suggestSplitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSplitPrompt',
  input: {
    schema: z.object({
      receiptData: z.string().describe('The extracted receipt data.'),
      numberOfPeople: z.number().describe('The number of people involved in the bill split.'),
    }),
  },
  output: {
    schema: z.object({
      suggestedSplit: z.string().describe('The suggested split of the bill for each person.'),
    }),
  },
  prompt: `You are an expert bill splitting assistant. Given the receipt data and the number of people, you will suggest a fair split of the bill.

Receipt Data: {{{receiptData}}}
Number of People: {{{numberOfPeople}}}

Suggest Split:`,
});

const suggestSplitFlow = ai.defineFlow<
  typeof SuggestSplitInputSchema,
  typeof SuggestSplitOutputSchema
>({
  name: 'suggestSplitFlow',
  inputSchema: SuggestSplitInputSchema,
  outputSchema: SuggestSplitOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});

