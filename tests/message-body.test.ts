import { describe, expect, it } from "vitest"

import { isHtmlBody, messagePreview } from "@/components/message-body"

describe("isHtmlBody", () => {
  it("detects HTML vs plain text", () => {
    expect(isHtmlBody("<p>Hello</p>")).toBe(true)
    expect(isHtmlBody("Hello there")).toBe(false)
    expect(isHtmlBody("")).toBe(false)
    expect(isHtmlBody(null)).toBe(false)
  })
})

describe("messagePreview", () => {
  it("strips tags from HTML bodies for list snippets", () => {
    expect(messagePreview("<p>Hi <strong>Ada</strong></p><ul><li>One</li></ul>")).toBe("Hi Ada\nOne")
    expect(messagePreview("<h2>Title</h2><p>Body</p>")).toBe("Title\nBody")
  })

  it("passes plain text through untouched (trimmed)", () => {
    expect(messagePreview("  Just text  ")).toBe("Just text")
    expect(messagePreview("")).toBe("")
  })
})
