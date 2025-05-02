# XIV in the Shell

FFXIV job simulators & rotation planners.

https://xivintheshell.com

Let us know if you encounter bugs and/or have questions or concerns.

Initial idea: Galahad Donnadieu @ Exodus (`ukitaeshiya`)  
Initial developer: Ellyn Waterford @ Sargatanas (`miyehn`)  
Currently maintained by: [@developers](https://github.com/orgs/xivintheshell/teams/developers) of [FFXIV in the Shell](https://github.com/xivintheshell).

Many thanks to the players from The Balance discord server for their invaluable feedback.

---

This project _was_ bootstrapped with [Create React App](https://github.com/facebook/create-react-app), but has since migrated
to [nextjs](https://nextjs.org/).

## Developer Notes
NextJS does some stupid things, so there are some differences in the development cycle under the new framework.

- Run the full type checker: `npm run check`. NextJS only reports the FIRST type error by default when in dev mode.
- Run a hot-reloading dev server: `npm start`. Note that some behavior is different in the dev version compared to
  the "production" build; in particular, 404 errors are reported as 500 errors instead, and may crash your build.
- Build and locally run the production site: `npm build && npm serve`.

Stack traces from `npm run test` are currently broken. If anyone can figure out why, please help us!