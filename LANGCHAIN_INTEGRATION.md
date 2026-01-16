# LangChain Integration

The extension currently uses the OpenAI API directly for generating "Steps to Reproduce" for debugging, which works immediately without requiring a build step.

## Current Implementation

The test case generation uses the OpenAI API directly via `fetch()` in `panel.js`. This is the same API that LangChain uses under the hood, so you get the same functionality.

## Using LangChain (Optional)

If you want to use LangChain for more advanced features (chains, agents, etc.), you can:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the LangChain bundle:**
   ```bash
   npm run build
   ```

3. **Use the bundled version:**
   - Create a `panel-langchain.js` file that uses LangChain
   - The build script will bundle it into `panel-langchain-bundle.js`
   - Include it in `panel.html` instead of the direct API calls

## Example LangChain Implementation

If you want to switch to LangChain, here's an example structure:

```javascript
// panel-langchain.js
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "langchain/prompts";

export async function generateStepsToReproduceWithLangChain(steps, apiKey) {
  const model = new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a technical writer expert at creating clear, reproducible step-by-step instructions for debugging."],
    ["user", "Convert these recorded steps into steps to reproduce: {steps}"]
  ]);

  const chain = prompt.pipe(model);
  const result = await chain.invoke({ steps: formatSteps(steps) });
  return result.content;
}
```

The current direct API implementation is simpler and works well for this use case. Use LangChain if you need:
- Complex prompt chains
- Agent-based workflows
- Integration with other LangChain tools
- More advanced LLM orchestration
