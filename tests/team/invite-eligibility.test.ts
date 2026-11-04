import { describe, expect, it } from "vitest"

import { inviteBlockReason } from "@/lib/team/invite-eligibility"

const WS = "ws_current"

describe("inviteBlockReason", () => {
  it("allows a brand-new email (no existing account)", () => {
    expect(inviteBlockReason(undefined, WS)).toBeNull()
    expect(inviteBlockReason(null, WS)).toBeNull()
  })

  it("blocks someone already bound to this workspace", () => {
    expect(inviteBlockReason({ id: "u1", workspaceId: WS }, WS)).toBe("already_member")
  })

  it("blocks the owner of this workspace even if their workspaceId column is unset", () => {
    expect(inviteBlockReason({ id: WS, workspaceId: null }, WS)).toBe("already_member")
  })

  it("allows a formerly-removed teammate who reverted to their own account", () => {
    // removeMember sets workspaceId to the user's own id.
    expect(inviteBlockReason({ id: "u2", workspaceId: "u2" }, WS)).toBeNull()
  })

  it("allows a solo self-serve account with no workspace bound", () => {
    expect(inviteBlockReason({ id: "u3", workspaceId: null }, WS)).toBeNull()
    expect(inviteBlockReason({ id: "u3", workspaceId: "" }, WS)).toBeNull()
    expect(inviteBlockReason({ id: "u3", workspaceId: "   " }, WS)).toBeNull()
  })

  it("blocks an active member of a different shared workspace", () => {
    expect(inviteBlockReason({ id: "u4", workspaceId: "ws_other" }, WS)).toBe("other_workspace")
  })
})
