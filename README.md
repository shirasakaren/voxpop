# VOXPOP

A tiny anime game about listening. You play Rin Sakuraba, a rookie reporter at the Hoshimachi Herald. Walk a planet-sized town, interview the people who live there and print the front page.

Every assignment is a real issue: single-use plastic, loneliness, digital privacy, urban heat and local shops. The game keeps the facts real and makes them personal.

## What is inside

- `index.html` is the story site. It has a scroll-driven 3D camera, a horizontal district tour, flip cards for the cast, topic polls, live key demos and plenty of small surprises.
- `play.html` is the game: a tiny walkable planet with seven hand-built districts, 11 residents, 20 interviews, 5 front pages, 12 hidden scoops, a cat, a shrine bell and a photo mode.
- `src/world` holds the procedural toon world. That covers the planet shader, the district kit, the anime characters, the sky and time of day.
- `src/game` holds the gameplay: sphere walking, follow camera, dialogue, quests, HUD and saves.
- `src/landing` holds the site.
- `src/shared` holds the generative jazz soundtrack and SFX (Tone.js), portraits, confetti and fonts.
- `src/data/story.js` holds all the writing: cast, assignments, dialogue and facts.

Every model, texture, sound and line of dialogue is generated in code. There are no external asset files.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm run preview
```

`dev.html` (world viewer) and `chars.html` (character line-up) are development tools and are not part of the build.

## Controls

| Action | Keyboard | Touch | Gamepad |
| --- | --- | --- | --- |
| Walk / run | WASD or arrows, Shift | Left thumb joystick | Left stick, RB |
| Look | Drag mouse, scroll to zoom | Drag right side | Right stick |
| Talk / use | E or Enter | TALK button | A |
| Jump | Space | JUMP button | B |
| Notebook | N or Tab | Notebook icon | Y |
| Wave / Photo mode | Q / C | | |
| Pause | Esc | Pause icon | Start |

## Sources for the facts in the game

OECD Global Plastics Outlook (2022), Pew Charitable Trusts "Breaking the Plastic Wave" (2020), WHO Commission on Social Connection (2025), Pew Research Center (2019), US EPA heat island research, Civic Economics local business studies and OECD SME Outlook.
