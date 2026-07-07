import "server-only"

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type AiProvider = "openai" | "anthropic"

type CompletionOptions = {
  json?: boolean
  model?: string
}

export function resolveAiProvider(): AiProvider | null {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase()
  if (explicit === "anthropic" || explicit === "openai") return explicit

  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim())
  const hasOpenai = Boolean(process.env.OPENAI_API_KEY?.trim())
  if (hasAnthropic && !hasOpenai) return "anthropic"
  if (hasOpenai) return "openai"
  if (hasAnthropic) return "anthropic"
  return null
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: CompletionOptions,
): Promise<string | null> {
  const provider = resolveAiProvider()
  if (!provider) return null

  if (provider === "anthropic") {
    return anthropicChatCompletion(messages, options)
  }
  return openaiChatCompletion(messages, options)
}

function systemPrompt(messages: ChatMessage[], json?: boolean) {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content)
  if (json) {
    systemParts.push("Respond with valid JSON only. No markdown fences or extra text.")
  }
  return systemParts.join("\n\n") || undefined
}

function conversationMessages(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
}

async function openaiChatCompletion(messages: ChatMessage[], options?: CompletionOptions) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const model = options?.model ?? process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini"

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        ...(options?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    })

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, await response.text())
      return null
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    return data.choices?.[0]?.message?.content ?? null
  } catch (error) {
    console.error("OpenAI request failed:", error)
    return null
  }
}

async function anthropicChatCompletion(messages: ChatMessage[], options?: CompletionOptions) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) return null

  const model =
    options?.model ?? process.env.ANTHROPIC_MODEL?.trim() ?? "claude-sonnet-4-5-20250929"

  const system = systemPrompt(messages, options?.json)
  const conversation = conversationMessages(messages)
  if (conversation.length === 0) return null

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0.2,
        ...(system ? { system } : {}),
        messages: conversation,
      }),
    })

    if (!response.ok) {
      console.error("Anthropic API error:", response.status, await response.text())
      return null
    }

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[]
    }
    const text = data.content?.find((block) => block.type === "text")?.text
    return text?.trim() ?? null
  } catch (error) {
    console.error("Anthropic request failed:", error)
    return null
  }
}
