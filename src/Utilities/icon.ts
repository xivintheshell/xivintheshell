export function iconUrl(icon: number, stacks: number = 1): string {
	const group = Math.floor(icon / 1000) * 1000
    const iconNumberStacked = icon + stacks - 1 // Normalize 1 stack and stack-less buffs back to the raw icon number
	const gamePath = `ui/icon/${group.toString(10).padStart(6, '0')}/${iconNumberStacked.toString(10).padStart(6, '0')}_hr1.tex`
	return `https://beta.xivapi.com/api/1/asset/${gamePath}?format=png`
}
