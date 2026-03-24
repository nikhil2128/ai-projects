import OpenAI from 'openai';
import { config } from '../config';
import { FloorPlan, FloorPlanSchema } from '../types';

const ANALYSIS_PROMPT = `You are an expert architectural floor plan analyzer. Analyze the provided 2D floor plan image and extract detailed room information.

For each room visible in the floor plan, extract:
1. name: A descriptive name (e.g., "Master Bedroom", "Kitchen", "Living Room", "Bathroom 1")
2. type: One of: bedroom, living_room, kitchen, bathroom, balcony, dining, hall, utility, other
3. width: Width in the measurement unit shown on the plan
4. length: Length in the measurement unit shown on the plan
5. x: The x-coordinate of the room's left edge, relative to the entire floor plan's left edge
6. y: The y-coordinate of the room's bottom edge, relative to the entire floor plan's bottom edge

Also extract:
- unit: The measurement unit used ("feet" or "meters"). If dimensions use the ' symbol or ft, use "feet". If they use m, use "meters".
- totalWidth: The total width of the entire floor plan
- totalLength: The total length of the entire floor plan

Return ONLY a valid JSON object with this exact structure:
{
  "unit": "feet",
  "totalWidth": 50,
  "totalLength": 40,
  "rooms": [
    {
      "name": "Living Room",
      "type": "living_room",
      "width": 15,
      "length": 20,
      "x": 0,
      "y": 0
    }
  ]
}

Critical guidelines:
- Read dimensions directly from the labels/annotations on the floor plan image
- Position rooms accurately so they tile together without overlapping
- Use the coordinate system where (0,0) is the bottom-left corner of the overall plan
- If a dimension is unclear, estimate based on relative sizes and neighboring rooms
- Include ALL rooms, passages, and spaces visible in the floor plan
- Ensure totalWidth and totalLength encompass all rooms
- Width refers to the horizontal dimension (x-axis), length refers to the vertical dimension (y-axis)`;

export async function analyzeFloorPlan(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<FloorPlan> {
  if (!config.openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please set it in your .env file.',
    );
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4096,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response received from OpenAI');
  }

  const parsed = JSON.parse(content);
  const validated = FloorPlanSchema.parse(parsed);

  return validated;
}
