import React, { useContext } from "react";
import { IconContext } from "react-icons";
import { FaBluesky, FaGithub, FaBlog } from "react-icons/fa6";
import { ColorThemeContext, getThemeField } from "./ColorTheme";
import { BSKY_URL, GITHUB_URL, BLOG_URL } from "./IntroSection";
import { localize } from "./Localization";

export function SocialLinks() {
	const theme = useContext(ColorThemeContext);
	const iconColor = getThemeField(theme, "text") as string;
	return <div
		style={{
			display: "inline-block",
			fontSize: 16,
		}}
	>
		<style>
			{/* note that the 1px solid offsets the icon a little when hovered, but as long as it's not
		moving the other icons around that's fine */}
			{`
		.linkOption {
			display: inline-block;
			cursor: pointer;
			vertical-align: top;
			margin-top: 1px;
		}
		.linkOption:hover {
			border-bottom: 1px solid;
		}
		`}
		</style>
		<div style={{ display: "inline-block" }}>
			<IconContext.Provider value={{ color: iconColor, className: "linkOption" }}>
				<a href={BSKY_URL} title={localize({ en: "Bluesky", zh: "蓝天" }) as string}>
					<FaBluesky />
				</a>
			</IconContext.Provider>
			|
			<IconContext.Provider value={{ color: iconColor, className: "linkOption" }}>
				<a href={GITHUB_URL} title={localize({ en: "GitHub", zh: "GitHub" }) as string}>
					<FaGithub />
				</a>
			</IconContext.Provider>
			|
			<IconContext.Provider value={{ color: iconColor, className: "linkOption" }}>
				<a href={BLOG_URL} title={localize({ en: "Blog", zh: "博客" }) as string}>
					<FaBlog />
				</a>
			</IconContext.Provider>
		</div>
	</div>;
}
