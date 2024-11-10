export function isUrl(input: string): boolean {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const url = new URL(input)
        return true;
    }
    catch {
        return false;
    }
}