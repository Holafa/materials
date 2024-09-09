export function escapeMarkdownV2(input: string): string {
    // TODO[architecture]: add more escapable characters.
    return input
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace(".", "\\.")
        .replace("`", "\`")
}