// The five rooms of the site. One source of truth for nav, the room map and stub pages.
export interface Section {
  slug: string;
  name: string;
  object: string; // what you click in the workshop scene
  blurb: string;
  accent: string; // CSS color used as this section's personality accent
  mood: string;
}

export const sections: Section[] = [
  {
    slug: 'work',
    name: 'Work',
    object: 'the monitor',
    blurb: 'Projects, write-ups and postmortems. What I built, what broke and what I learned.',
    accent: '#c29b45',
    mood: 'Blueprints and terminal output',
  },
  {
    slug: 'gameday',
    name: 'Gameday',
    object: 'the pennant',
    blurb: 'Every Washington season since 1932 on one chart. Run the numbers and check the math.',
    accent: '#8a2533',
    mood: 'Vintage program, stat sheets',
  },
  {
    slug: 'the-mat',
    name: 'The Mat',
    object: 'the belt on the hook',
    blurb: 'Jiu-jitsu since 2010. Notes from training and coaching.',
    accent: '#6a4a9c',
    mood: 'Belt colors and chalk lines',
  },
  {
    slug: 'the-word',
    name: 'The Word',
    object: 'the Bible on the shelf',
    blurb: 'Scripture for whatever you are carrying today. Pick a mood, read slowly.',
    accent: '#b08a3e',
    mood: 'Quiet, cream paper, room to breathe',
  },
  {
    slug: 'lab',
    name: 'The Lab',
    object: 'the rig and the server rack',
    blurb: 'The rig, the home server and how this site runs, minus the private bits.',
    accent: '#3f8f6a',
    mood: 'Rack lights and spec sheets',
  },
];
