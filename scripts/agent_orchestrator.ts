import { Project, SourceFile, Node } from "ts-morph";
import pLimit from "p-limit";
import { GoogleGenAI } from "@google/genai";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment/process.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const limit = pLimit(12);

// Initialize ts-morph project
const project = new Project({
    tsConfigFilePath: path.join(__dirname, "../tsconfig.json"),
});

// We only process specific directories to avoid massive delays/node_modules
const targetDirectories = ["lib", "app", "components", "types"];
const sourceFiles = project.getSourceFiles().filter(sf => {
    const p = sf.getFilePath();
    return targetDirectories.some(dir => p.includes(`/${dir}/`) || p.includes(`\\${dir}\\`));
});

console.log(`Found ${sourceFiles.length} files to process.`);

async function processFile(sf: SourceFile, agentId: number) {
    const filePath = sf.getFilePath();
    console.log(`[Agent ${agentId}] Processing: ${filePath}`);

    // Get all top-level statements that can have JSDocs
    const nodesToDocument: { name: string, type: string, code: string, node: any }[] = [];

    for (const statement of sf.getStatements()) {
        if (Node.isFunctionDeclaration(statement)) {
            const name = statement.getName();
            if (name) nodesToDocument.push({ name, type: 'Function', code: statement.getText(), node: statement });
        } else if (Node.isClassDeclaration(statement)) {
            const name = statement.getName();
            if (name) nodesToDocument.push({ name, type: 'Class', code: statement.getText(), node: statement });
        } else if (Node.isInterfaceDeclaration(statement)) {
            const name = statement.getName();
            if (name) nodesToDocument.push({ name, type: 'Interface', code: statement.getText(), node: statement });
        } else if (Node.isTypeAliasDeclaration(statement)) {
            const name = statement.getName();
            if (name) nodesToDocument.push({ name, type: 'Type', code: statement.getText(), node: statement });
        } else if (Node.isVariableStatement(statement)) {
            // For constants and arrow functions
            const decls = statement.getDeclarations();
            for (const d of decls) {
                const name = d.getName();
                if (name) nodesToDocument.push({ name, type: 'Variable', code: statement.getText(), node: statement });
            }
        }
    }

    if (nodesToDocument.length === 0) {
        console.log(`[Agent ${agentId}] No documentable nodes found in ${filePath}. Generating just CLAUDE.md`);
    }

    const fileText = sf.getText();
    const prompt = `
You are an expert software engineer documenting a codebase.
Task: Document the file below.
File path: ${filePath}

For each identified node, provide a JSDoc string explaining:
1. What it does
2. Why it is used
3. Important implementation details
Do NOT include the /* or */ or /** in the returned JSDoc string, just the inner content or plain text. We will wrap it in /** */.

Also, provide markdown content for a CLAUDE.md file that explains what this code file is about, its responsibilities, dependencies, and how it is used.

Return a valid JSON object matching this schema:
{
  "jsdocs": {
    "NodeName": "JSDoc text for this node"
  },
  "claude_md": "Markdown content for the file's CLAUDE.md"
}

Code:
\`\`\`typescript
${fileText.substring(0, 50000)} // Truncated to 50k chars
\`\`\`

List of nodes to document:
${nodesToDocument.map(n => `- ${n.type}: ${n.name}`).join('\n')}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) {
             console.log(`[Agent ${agentId}] No text returned for ${filePath}.`);
             return;
        }

        // Clean json output if it has backticks
        const cleanText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        let result: any;
        try {
            result = JSON.parse(cleanText);
        } catch (e) {
            console.error(`[Agent ${agentId}] Failed to parse JSON for ${filePath}: ${e}`);
            return;
        }

        // Add JSDocs to AST
        if (result.jsdocs) {
            for (const nodeInfo of nodesToDocument) {
                const doc = result.jsdocs[nodeInfo.name];
                if (doc && nodeInfo.node.addJsDoc) {
                    nodeInfo.node.addJsDoc(doc);
                }
            }
            await sf.save();
        }

        // Write [filename].CLAUDE.md in the same directory
        if (result.claude_md) {
            const claudeMdPath = filePath + ".CLAUDE.md";
            fs.writeFileSync(claudeMdPath, result.claude_md);
            console.log(`[Agent ${agentId}] Wrote ${claudeMdPath}`);
        }

    } catch (err) {
        console.error(`[Agent ${agentId}] Failed to process ${filePath}:`, err);
    }
}

async function run() {
    console.log("Spinning up 12 parallel agents...");
    const promises: Promise<void>[] = [];
    
    // Processing all files
    const filesToProcess = sourceFiles;

    let agentCounter = 0;
    for (const sf of filesToProcess) {
        agentCounter = (agentCounter % 12) + 1;
        const agentId = agentCounter;
        promises.push(limit(() => processFile(sf, agentId)));
    }

    await Promise.all(promises);
    console.log("All parallel agents completed their tasks.");
}

run();
