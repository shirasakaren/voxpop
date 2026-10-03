// VOXPOP story bible. Everything the town says lives here.
// House rules: short sentences, warm but professional, no em dashes.

export const TOWN = {
  name: 'Hoshimachi',
  kanji: '星町',
  paper: 'The Hoshimachi Herald',
};

export const HERO = {
  id: 'rin',
  name: 'Rin Sakuraba',
  role: 'Rookie reporter',
  age: 19,
  bio: 'First week on the job. One notebook, one microphone, a lot of nerve.',
};

// Lat/lon in degrees on the tiny planet. Heading in degrees, 0 = north.
export const DISTRICTS = [
  { id: 'herald', name: 'Herald Plaza', jp: '新聞広場', lat: 90, lon: 0, blurb: 'Home base. The presses never fully sleep, and neither does the chief.' },
  { id: 'station', name: 'Hoshi Station & Arcade', jp: '星駅商店街', lat: 38, lon: 0, blurb: 'Trains, flowers and the best taiyaki in town. Busy from dawn.' },
  { id: 'shrine', name: 'Lantern Hill Shrine', jp: '灯籠山神社', lat: 46, lon: 130, blurb: 'Ninety-nine steps. A bell that sounds like rain. Wishes welcome.' },
  { id: 'park', name: 'Hinata Park & School', jp: '日向公園', lat: 36, lon: 240, blurb: 'Swings, a basketball hoop, and students pretending not to study.' },
  { id: 'beach', name: 'Kaigan Beach & Pier', jp: '海岸', lat: -30, lon: 60, blurb: 'Soft sand, loud gulls, and a lighthouse at the end of the pier.' },
  { id: 'alley', name: 'Neon Yokocho', jp: '横丁', lat: -18, lon: 180, blurb: 'Lanterns, steam and ramen. The town talks loudest after dark.' },
  { id: 'homes', name: 'Tsukimi Residences', jp: '月見団地', lat: -18, lon: 300, blurb: 'Balconies, laundry lines and neighbors who know your schedule.' },
];

export const ASSIGNMENTS = [
  {
    id: 'plastic',
    no: '01',
    title: 'The Plastic Tide',
    jp: 'プラスチックの波',
    time: 'morning',
    topic: 'Single-use plastic and our sea',
    brief: 'Our beach is collecting more than shells. Find out how people feel about single-use plastic.',
    voices: ['hana', 'tetsuo', 'aiko', 'kenji'],
    fact: 'Only about 9% of plastic waste is recycled worldwide.',
    factSource: 'OECD Global Plastics Outlook, 2022',
    fact2: 'Roughly 11 million tonnes of plastic enter the ocean every year.',
    fact2Source: 'Pew Charitable Trusts, 2020',
    tip: 'Carry a bottle. Refuse the extra bag. Small habits add up when a whole town does them.',
    headline: 'Town Splits Over Plastic. Sea Is Not Waiting.',
    kicker: 'Four residents. One shoreline. Different reasons to care.',
    chiefOpen: [
      'Sakuraba. Good, you are early.',
      'Kaigan Beach had three bags of bottles this morning. Hana from lifeguard duty is furious.',
      'I want voices. Not experts. Real people. Four of them.',
      'Go ask the town how it feels about single-use plastic. Bring me honesty.',
    ],
    chiefClose: [
      'A lifeguard, a fisherman, a florist and a tired salaryman.',
      'None of them agree. All of them care. That is a front page.',
      'Print it.',
    ],
  },
  {
    id: 'lonely',
    no: '02',
    title: 'Alone Together',
    jp: 'ひとりと、みんな',
    time: 'noon',
    topic: 'Loneliness in a busy town',
    brief: 'Hoshimachi is busy. That does not mean nobody is lonely. Ask people about connection.',
    voices: ['fumi', 'yuki', 'daichi', 'mei'],
    fact: 'About 1 in 6 people worldwide are affected by loneliness.',
    factSource: 'WHO Commission on Social Connection, 2025',
    fact2: 'Strong social ties are linked to better health and a longer life.',
    fact2Source: 'WHO, 2025',
    tip: 'Say hello to a neighbor. Message the friend who went quiet. It costs nothing and it matters.',
    headline: 'Surrounded, Yet Alone: Hoshimachi Opens Up',
    kicker: 'A grandmother, a student, a courier and a nurse on what it means to feel seen.',
    chiefOpen: [
      'Your plastic piece got letters. Good letters.',
      'Next one is harder. Loneliness.',
      'Everyone smiles on the street. I want to know what happens after they get home.',
      'Be gentle. People will tell you things they never told anyone.',
    ],
    chiefClose: [
      'You listened. I can tell from the quotes.',
      'Some of these made me call my sister. Do not tell anyone.',
      'Print it.',
    ],
  },
  {
    id: 'privacy',
    no: '03',
    title: "Who's Watching?",
    jp: '誰が見てる？',
    time: 'afternoon',
    topic: 'Digital privacy',
    brief: 'Our phones know where we sleep. Ask the town how much privacy they are willing to trade.',
    voices: ['sora', 'yuki', 'kenji', 'aiko'],
    fact: 'Only 9% of US adults say they always read privacy policies before agreeing to them.',
    factSource: 'Pew Research Center, 2019',
    fact2: 'Many free apps earn money from the data they collect about you.',
    fact2Source: 'Herald explainer',
    tip: 'Check your app permissions once a month. If a flashlight app wants your contacts, ask why.',
    headline: 'The Price of Free: What Our Phones Know',
    kicker: 'A coder, a student, an office worker and a florist weigh convenience against privacy.',
    chiefOpen: [
      'Question for you. How many apps on your phone know your location right now?',
      'Exactly. Nobody knows.',
      'Find out what Hoshimachi thinks about privacy. Some will shrug. Some will panic. Get both.',
    ],
    chiefClose: [
      'Balanced. Nobody comes out as the villain. I like that.',
      'I just turned off location for my weather app. It wanted my contacts too.',
      'Print it.',
    ],
  },
  {
    id: 'heat',
    no: '04',
    title: 'Hot Streets',
    jp: '灼熱の街',
    time: 'dusk',
    topic: 'Urban heat and street trees',
    brief: 'Summers are getting longer. Ask how the heat is changing daily life in town.',
    voices: ['taro', 'fumi', 'daichi', 'hana'],
    fact: 'Shaded surfaces can be 11 to 25°C cooler than unshaded ones at peak sun.',
    factSource: 'US Environmental Protection Agency',
    fact2: 'Cities often run several degrees hotter than the land around them.',
    fact2Source: 'US EPA, heat island research',
    tip: 'Protect and water street trees. Check on older neighbors during heat waves. Drink water before you feel thirsty.',
    headline: 'Hoshimachi Feels the Heat',
    kicker: 'From ramen kitchens to the open sea, the town is sweating the details.',
    chiefOpen: [
      'Did you see the thermometer at the station? Thirty-six degrees. In the shade.',
      'The heat is the story nobody notices until it is too late.',
      'Talk to people who work in it. Talk to people who cannot escape it.',
    ],
    chiefClose: [
      'This one feels urgent without shouting. Hard to do.',
      'The council meets Thursday about the street trees. This lands Wednesday. Perfect.',
      'Print it.',
    ],
  },
  {
    id: 'local',
    no: '05',
    title: 'Last Shop Standing',
    jp: '最後の店',
    time: 'night',
    topic: 'Local shops in an app world',
    brief: 'Delivery apps are everywhere. Ask what it means for the small shops that make Hoshimachi feel like home.',
    voices: ['taro', 'tetsuo', 'sora', 'mei'],
    fact: 'Independent shops tend to keep more of each sale circulating in the local economy than large chains.',
    factSource: 'Civic Economics, multi-city studies',
    fact2: 'Small businesses employ a large share of workers in most countries.',
    fact2Source: 'OECD SME Outlook',
    tip: 'Buy one thing a week from a local shop. Learn the owner’s name. That is how a street stays alive.',
    headline: 'Can a Small Shop Survive a Big App?',
    kicker: 'A chef, a fisherman, a coder and a nurse on convenience, community and the corner store.',
    chiefOpen: [
      'Last assignment of the week. Then you sleep. That is an order.',
      'The tofu shop on Arcade Street closed yesterday. Forty years. Gone.',
      'Ask the town about local shops and delivery apps. No easy answers. Find the real ones.',
    ],
    chiefClose: [
      'Five front pages in one week, Sakuraba.',
      'You came here asking how to do this job. You just did it.',
      'Print it. Then go home. Actually go home.',
    ],
  },
];

// Every resident of Hoshimachi worth interviewing.
// look: procedural character recipe. See world/characters.js.
export const CAST = [
  {
    id: 'kuroda',
    name: 'Goro Kuroda',
    role: 'Editor-in-chief',
    district: 'herald',
    at: [0, 6.0, 180],
    color: '#e63946',
    look: { skin: '#f1c7a5', hair: 'short', hairColor: '#3b3b44', grey: true, top: '#2b2d42', bottom: '#4a4e69', accent: '#e63946', acc: ['glasses', 'tie', 'mug'], height: 1.08, build: 1.15, eye: '#5c4033' },
    bio: 'Thirty years of deadlines. Drinks coffee like it is oxygen. Softer than he looks.',
    idle: [
      'Deadline is a state of mind, Sakuraba.',
      'Go. The town will not interview itself.',
      'You have that look. Like you found something. Go find more.',
    ],
  },
  {
    id: 'hana',
    name: 'Hana Mizuki',
    role: 'Lifeguard',
    district: 'beach',
    at: [-5.5, -8.5, 20],
    color: '#00b4d8',
    look: { skin: '#e0a882', hair: 'ponytail', hairColor: '#f2a541', top: '#e63946', bottom: '#1d3557', accent: '#ffffff', acc: ['visor', 'whistle'], height: 1.0, build: 1.0, eye: '#2a9d8f' },
    bio: 'Swims before sunrise. Picks up every bottle she sees. Every single one.',
    idle: [
      'Tide is coming in. So is the trash.',
      'Want to help? Grab a bag. Kidding. Mostly.',
      'The sea is honest. It gives back what we give it.',
    ],
    interviews: {
      plastic: {
        intro: ['Hey, Herald girl. You here about the bottles?'],
        options: [
          { label: 'Straight to it', rin: 'I am. How bad is it out here?', reply: 'Bad. I filled two bags before my shift even started.' },
          { label: 'Warm up first', rin: 'I am. You look like you have been up for hours.', reply: 'Since five. The beach does not clean itself. Sadly.' },
        ],
        opinion: [
          'People think plastic disappears when they throw it away. It does not. It ends up right here.',
          'Caps, straws, those little sauce packets. The sea breaks them into tiny pieces and fish eat them.',
          'I am not asking for perfect. Just bring a bottle. Say no to the straw.',
        ],
        quote: 'People think plastic disappears when they throw it away. It ends up right here.',
        react: 'She means it. You can hear it in every word.',
        after: 'Put my name in big letters, okay? Kidding. Put the bottles in big letters.',
      },
      heat: {
        intro: ['Rin! Feel that water. It is like a bath.'],
        options: [
          { label: 'Ask about the sea', rin: 'Is the sea really getting warmer?', reply: 'I have measured it every morning for six years. Yes.' },
          { label: 'Ask about her', rin: 'How does the heat affect your work?', reply: 'More swimmers. More heatstroke. More rescues. Busy summers.' },
        ],
        opinion: [
          'Warmer water means different fish. Tetsuo says his catch moved north.',
          'Jellyfish are showing up earlier every year. That is not a coincidence.',
          'Heat is not just a city problem. The sea feels it too. It just cannot complain.',
        ],
        quote: 'Heat is not just a city problem. The sea feels it too. It just cannot complain.',
        react: 'The sea cannot complain. That line will stick with you.',
        after: 'Drink water, Rin. You look pink. Reporters faint too.',
      },
    },
  },
  {
    id: 'tetsuo',
    name: 'Tetsuo Oda',
    role: 'Fisherman',
    district: 'beach',
    at: [0.4, -16, 90],
    color: '#457b9d',
    look: { skin: '#c68c5a', hair: 'bald', hairColor: '#cfcfcf', grey: true, top: '#457b9d', bottom: '#3d405b', accent: '#f4a261', acc: ['towel', 'beard', 'rod'], height: 0.96, build: 1.2, eye: '#3d2b1f' },
    bio: 'Fifty years on the water. Says little. Means all of it.',
    idle: [
      'Fish do not bite when you talk too much.',
      'My father fished here. And his father.',
      'Hmph. Sit if you want. The sea is free.',
    ],
    interviews: {
      plastic: {
        intro: ['Hm. A reporter. On my pier.'],
        options: [
          { label: 'Be polite', rin: 'Sorry to bother you, Oda-san. Could I ask about plastic?', reply: 'You are not bothering me. The plastic is.' },
          { label: 'Be direct', rin: 'Your nets. What do they bring up these days?', reply: 'More bottles than fish, some mornings.' },
        ],
        opinion: [
          'When I was a boy, the nets came up silver. Now they come up colorful. That is not a good thing.',
          'I am not an activist. I am a fisherman. But this is my living.',
          'Fix it at the shop. Not at the sea. By the time it gets here, it is too late.',
        ],
        quote: 'Fix it at the shop. Not at the sea. By the time it gets here, it is too late.',
        react: 'Short sentences. Heavy ones.',
        after: 'Write it plain. People respect plain.',
      },
      local: {
        intro: ['You again. Want fish? Fresh this morning.'],
        options: [
          { label: 'Buy a fish first', rin: 'One mackerel, please. And a question?', reply: 'For a customer, two questions.' },
          { label: 'Just ask', rin: 'The new supermarket opened. How is business?', reply: 'Quieter. Not dead. Quieter.' },
        ],
        opinion: [
          'The supermarket sells fish cheaper than I can catch it. I do not know how.',
          'But my regulars still come. They ask about my knee. I ask about their kids.',
          'A machine can sell you fish. It cannot tell you which one to cook tonight.',
        ],
        quote: 'A machine can sell you fish. It cannot tell you which one to cook tonight.',
        react: 'You realize you also want to know which one to cook tonight.',
        after: 'Grill it with salt. Nothing else. Trust me.',
      },
    },
  },
  {
    id: 'aiko',
    name: 'Aiko Nakamura',
    role: 'Florist',
    district: 'station',
    at: [6.4, 3.3, -110],
    color: '#ff8fab',
    look: { skin: '#f6d1b8', hair: 'bun', hairColor: '#6b3e26', top: '#f7f1e3', bottom: '#84a59d', accent: '#ff8fab', acc: ['apron', 'flower'], height: 0.95, build: 0.95, eye: '#6b3e26' },
    bio: 'Runs Hanamichi Flowers by the station. Knows every birthday in town.',
    idle: [
      'Sunflowers today. They make people braver.',
      'Every bouquet has a story. Most are apologies.',
      'Come back Friday. Peonies arrive.',
    ],
    interviews: {
      plastic: {
        intro: ['Rin! You need flowers? You look like you need flowers.'],
        options: [
          { label: 'Ask about the shop', rin: 'Your bouquets used to come in plastic. Now they are in paper?', reply: 'You noticed! Almost nobody noticed.' },
          { label: 'Ask how she feels', rin: 'How do you feel about all the plastic talk lately?', reply: 'Honestly? A little defensive. Then a little guilty.' },
        ],
        opinion: [
          'I switched to paper wrap last spring. It costs me almost double.',
          'Some customers complained. Paper tears in the rain. They are right about that.',
          'But I sleep better. Being a little inconvenient is fine if it helps.',
        ],
        quote: 'Being a little inconvenient is fine if it helps.',
        react: 'A small choice. A real cost. She made it anyway.',
        after: 'Take a daisy. On the house. Reporters need flowers too.',
      },
      privacy: {
        intro: ['Hello again! Did you download my shop app yet?'],
        options: [
          { label: 'Ask about the app', rin: 'You have an app now? What does it know about me?', reply: 'Your birthday. Your favorite flowers. That is it, I promise.' },
          { label: 'Ask about loyalty cards', rin: 'Do you like loyalty programs as a shop owner?', reply: 'Love them. They help me remember people.' },
        ],
        opinion: [
          'I use loyalty apps everywhere. Free coffee every tenth cup? Yes please.',
          'I know they track what I buy. For me, that is a fair trade.',
          'But I want to choose. Ask me first. Tell me plainly. Then I decide.',
        ],
        quote: 'I know they track what I buy. For me, that is fair. But ask me first.',
        react: 'Not scared. Not careless. Just wants a choice.',
        after: 'If my app ever asks for your contacts, report me. Seriously.',
      },
    },
  },
  {
    id: 'kenji',
    name: 'Kenji Morimoto',
    role: 'Office worker',
    district: 'station',
    at: [-4.6, -3.0, 55],
    color: '#8d99ae',
    look: { skin: '#eac4a2', hair: 'short', hairColor: '#1b1b1f', top: '#2b2d42', bottom: '#2b2d42', accent: '#8ecae6', acc: ['tie', 'bag'], height: 1.04, build: 1.0, eye: '#2b2d42', tired: true },
    bio: 'Takes the 7:12 train every day. Has not missed it in nine years.',
    idle: [
      'The 7:12 waits for no one.',
      'I have meetings about meetings. Do you need a quote about that?',
      'Is it Friday? It feels like it should be Friday.',
    ],
    interviews: {
      plastic: {
        intro: ['Ah. I have four minutes until my train.'],
        options: [
          { label: 'Be quick', rin: 'Then I will be fast. Plastic bottles. Thoughts?', reply: 'I buy three a day. Bottled tea. I know. I know.' },
          { label: 'Be kind', rin: 'Rough morning? I can walk with you.', reply: 'Every morning is rough. Ask your question.' },
        ],
        opinion: [
          'I know plastic is bad. Everybody knows. But I leave at six and come back at ten.',
          'Convenience is not laziness when you are this tired. It is survival.',
          'Put a water fountain on the platform and I will use it tomorrow. Make the easy choice the good one.',
        ],
        quote: 'Make the easy choice the good one, and tired people will take it.',
        react: 'Not an excuse. A design problem. Noted.',
        after: 'If they install that fountain, I want credit.',
      },
      privacy: {
        intro: ['Lunch break. Twelve minutes left. Go.'],
        options: [
          { label: 'Ask about work', rin: 'Does your company monitor your laptop?', reply: 'Every click. They told us at orientation.' },
          { label: 'Ask about his phone', rin: 'Do you worry about what your phone tracks?', reply: 'I worry about my work phone more.' },
        ],
        opinion: [
          'At work I understand it. Security. Client data. Fine.',
          'But they asked to install the same software on my personal phone. I said no.',
          'My weekends belong to me. Some lines matter even if nobody is looking.',
        ],
        quote: 'My weekends belong to me. Some lines matter even if nobody is looking.',
        react: 'He said no. Quietly. That took courage.',
        after: 'Do not use my photo. Or do. I will deny everything.',
      },
    },
  },
  {
    id: 'fumi',
    name: 'Fumi Hayashi',
    role: 'Shrine keeper',
    district: 'shrine',
    at: [-1.6, -2.6, 215],
    color: '#bc4749',
    look: { skin: '#f0cfb0', hair: 'bun', hairColor: '#d9d9d9', grey: true, top: '#bc4749', bottom: '#f7f1e3', accent: '#f2e8cf', acc: ['shawl', 'broom'], height: 0.86, build: 0.95, eye: '#3d2b1f', elder: true },
    bio: 'Sweeps the shrine steps every morning. Eighty-one years old. Fastest broom in town.',
    idle: [
      'Ring the bell. The gods like a little noise.',
      'Young people walk so fast. Where are you all going?',
      'Have you eaten? You look thin.',
    ],
    interviews: {
      lonely: {
        intro: ['Oh, a visitor! Sit, sit. The step is clean, I promise.'],
        options: [
          { label: 'Sit with her', rin: 'Thank you. Do you get many visitors up here?', reply: 'On festival days, hundreds. On Tuesdays, the crows.' },
          { label: 'Ask gently', rin: 'Do you ever feel lonely up here, Fumi-san?', reply: 'You ask a brave question for someone so young.' },
        ],
        opinion: [
          'My husband passed three winters ago. My son lives in the big city. He calls on Sundays.',
          'The shrine gives me a reason to wake up. Someone has to sweep. Someone has to say good morning.',
          'Loneliness is not about being alone. It is about nobody noticing if you were gone.',
        ],
        quote: 'Loneliness is not about being alone. It is about nobody noticing if you were gone.',
        react: 'You stay a little longer than you planned. It feels right.',
        after: 'Come Tuesday. Bring the crows some company.',
      },
      heat: {
        intro: ['Rin-chan. Come into the shade, quickly.'],
        options: [
          { label: 'Ask about summers', rin: 'Are summers really hotter than when you were young?', reply: 'When I was young, we did not need a word for heatstroke.' },
          { label: 'Ask about her health', rin: 'How do you stay cool up here?', reply: 'Barley tea, a fan and stubbornness.' },
        ],
        opinion: [
          'My doctor says I must use the air conditioner. But the electricity bill frightens me more than the heat.',
          'Last August my neighbor fainted in her kitchen. Nobody found her until evening. She was lucky.',
          'Old people do not complain. So please, check on us. Knock. We will pretend to be annoyed.',
        ],
        quote: 'Old people do not complain. So please, check on us. We will pretend to be annoyed.',
        react: 'You make a note to knock on more doors this summer.',
        after: 'Take a barley tea. It is free for reporters with sunburns.',
      },
    },
  },
  {
    id: 'yuki',
    name: 'Yuki Shirane',
    role: 'High school student',
    district: 'park',
    at: [-4.4, 2.2, 150],
    color: '#7b2cbf',
    look: { skin: '#f8dcc4', hair: 'twintails', hairColor: '#9d4edd', top: '#14213d', bottom: '#14213d', accent: '#ffd60a', acc: ['headphones', 'phone'], height: 0.93, build: 0.9, eye: '#7b2cbf', school: true },
    bio: 'Second year at Hinata High. Streams games at night. Top of class in chemistry, somehow.',
    idle: [
      'Shh. Boss fight.',
      'Are you a streamer too? You have the energy.',
      'School is fine. Lunch is the hard part.',
    ],
    interviews: {
      lonely: {
        intro: ['Oh. Hi. Are you from the paper? That is so retro. I love it.'],
        options: [
          { label: 'Ask about friends', rin: 'Do you have a lot of friends?', reply: 'Three hundred and twelve followers. So, yes? Kind of?' },
          { label: 'Ask about lunch', rin: 'You said lunch is hard. Why?', reply: 'Wow. You actually listen. Okay.' },
        ],
        opinion: [
          'Online, I talk to people all night. They laugh at my jokes. They send hearts.',
          'Then lunch comes and I eat on this bench. Alone. With my phone.',
          'Hundreds of people know my username. Nobody here knows my favorite snack.',
        ],
        quote: 'Hundreds of people know my username. Nobody here knows my favorite snack.',
        react: 'Melon bread. You saw the wrapper. You remember it now.',
        after: 'It is melon bread. My favorite snack. Just so someone knows.',
      },
      privacy: {
        intro: ['Rin! Check this filter. It turns you into a cat.'],
        options: [
          { label: 'Try the filter', rin: 'Okay, that is cute. What does the app need to do that?', reply: 'Camera. Mic. Location. Contacts. Normal stuff.' },
          { label: 'Ask about sharing', rin: 'Do you share your location with friends?', reply: 'Always. With like, forty people.' },
        ],
        opinion: [
          'I always say I have nothing to hide. I am sixteen. What would anyone want?',
          'But then a stranger commented the name of my school. I never posted it. I felt sick.',
          'Now I think privacy is not about hiding. It is about choosing who gets to find you.',
        ],
        quote: 'Privacy is not about hiding. It is about choosing who gets to find you.',
        react: 'Sixteen. Wiser than most adults you know.',
        after: 'I turned location off for thirty-eight people. Kept two. Growth.',
      },
    },
  },
  {
    id: 'daichi',
    name: 'Daichi Ishikawa',
    role: 'Bike courier',
    district: 'homes',
    at: [-2.2, 3.6, 160],
    color: '#06d6a0',
    look: { skin: '#d9a273', hair: 'spiky', hairColor: '#ff6b35', top: '#06d6a0', bottom: '#073b4c', accent: '#ffd166', acc: ['cap', 'backpack'], height: 1.03, build: 1.05, eye: '#3d2b1f' },
    bio: 'Delivers ramen, documents and the occasional cat. Never takes the elevator.',
    idle: [
      'On the clock. Talk fast or ride with me.',
      'Forty-two deliveries yesterday. New record.',
      'The hill by the shrine is my nemesis.',
    ],
    interviews: {
      lonely: {
        intro: ['Yo! Ninety seconds. Next drop is the danchi.'],
        options: [
          { label: 'Keep up', rin: 'Then I will walk fast. You meet people all day, right?', reply: 'A hundred doors a day. Easy.' },
          { label: 'Slow him down', rin: 'Take ninety seconds for you. When did you last sit down?', reply: 'Ha. Good question. Tuesday?' },
        ],
        opinion: [
          'I see a hundred faces a day. Door opens. Bag goes in. Door closes.',
          'Nobody asks my name. Not rude. Just busy. Everyone is busy.',
          'One lady on the third floor always says "Thank you, Daichi." Best part of my week.',
        ],
        quote: 'One lady always says "Thank you, Daichi." Best part of my week.',
        react: 'Two words. That is all it takes. Write that down twice.',
        after: 'Tell your readers. Use our names. It is on the app.',
      },
      heat: {
        intro: ['Rin! Water. Do you have water? Kidding. I have six bottles.'],
        options: [
          { label: 'Ask about routes', rin: 'How do you deal with the heat on the road?', reply: 'I have a shade map in my head.' },
          { label: 'Ask about his body', rin: 'Is it dangerous? Riding in this?', reply: 'My friend collapsed last summer. So, yes.' },
        ],
        opinion: [
          'The asphalt by the station hits fifty degrees. You can feel it through your shoes.',
          'Under the trees in Hinata Park, it is a different planet. Cool. Breezy.',
          'Every tree they cut for a parking lot, I feel it. On my skin. Every single day.',
        ],
        quote: 'Every tree they cut for a parking lot, I feel it on my skin. Every day.',
        react: 'He lives the data. He does not need a chart.',
        after: 'Protect the trees, Rin. Protect the couriers.',
      },
    },
  },
  {
    id: 'mei',
    name: 'Mei Kobayashi',
    role: 'Night nurse',
    district: 'alley',
    at: [0.4, 1.6, 180],
    color: '#4cc9f0',
    look: { skin: '#f3d0b5', hair: 'long', hairColor: '#22223b', top: '#caf0f8', bottom: '#90e0ef', accent: '#4cc9f0', acc: ['cardigan'], height: 0.98, build: 0.95, eye: '#22223b' },
    bio: 'Works nights at Hoshimachi General. Eats ramen at 3 a.m. Saves lives in between.',
    idle: [
      'My breakfast is your dinner. Shift life.',
      'Taro saves me a seat. Every night.',
      'Sleep is a rumor.',
    ],
    interviews: {
      lonely: {
        intro: ['Hm? Oh, sorry. I was half asleep. Hi.'],
        options: [
          { label: 'Ask about nights', rin: 'What is it like working when the town sleeps?', reply: 'Quiet. Beautiful. Lonely.' },
          { label: 'Ask about friends', rin: 'Do you see your friends much?', reply: 'Their weekends are my sleep. So, no.' },
        ],
        opinion: [
          'For a year, I only talked to patients and vending machines.',
          'Then I found Taro\'s ramen stall. Same faces every night. Taxi drivers. Bakers. A security guard who sings.',
          'We do not even know each other\'s last names. But if I miss a night, they text me.',
        ],
        quote: 'We do not know each other\'s last names. But if I miss a night, they text me.',
        react: 'Community does not need a schedule. Just a counter and a seat.',
        after: 'Come by at 3 a.m. sometime. The singing guard is worth it.',
      },
      local: {
        intro: ['Rin! You are up late. Want some gyoza?'],
        options: [
          { label: 'Ask honestly', rin: 'Do you use delivery apps?', reply: 'All the time. Do not judge me.' },
          { label: 'Ask about Taro', rin: 'Would you be sad if Taro\'s stall closed?', reply: 'I would cry. Really cry.' },
        ],
        opinion: [
          'When you work twelve hours, convenience is not a luxury. Groceries at midnight save me.',
          'So please do not make people like me feel guilty. We are doing our best.',
          'But I come here in person when I can. Because an app never asks how your shift went.',
        ],
        quote: 'An app never asks how your shift went. That is why I come in person when I can.',
        react: 'Both things can be true. She holds both.',
        after: 'Do not tell Taro I use the apps. He knows. But do not tell him.',
      },
    },
  },
  {
    id: 'sora',
    name: 'Sora Fujimoto',
    role: 'Software developer',
    district: 'alley',
    at: [-1.6, 7.6, 160],
    color: '#ffd60a',
    look: { skin: '#e9c09b', hair: 'messy', hairColor: '#283618', top: '#3a3a3a', bottom: '#606c38', accent: '#ffd60a', acc: ['glasses', 'hoodie', 'laptop'], height: 1.0, build: 0.95, eye: '#283618' },
    bio: 'Builds apps by day. Fixes the town\'s Wi-Fi by night. Unpaid.',
    idle: [
      'Have you tried turning your life off and on again?',
      'Coffee is just a dependency I never uninstalled.',
      'I could explain cookies. Not the tasty kind.',
    ],
    interviews: {
      privacy: {
        intro: ['Ah, the reporter. Did you accept all cookies on the way here?'],
        options: [
          { label: 'Admit it', rin: 'Probably. Is that bad?', reply: 'Not bad. Just expensive. You paid with data.' },
          { label: 'Push back', rin: 'Everyone accepts. What choice do we have?', reply: 'Fair. That is the real problem.' },
        ],
        opinion: [
          'Free apps still need money. Usually it comes from what they learn about you.',
          'Where you go. What you buy. When you sleep. It gets packaged and sold. Most people never see it.',
          'If you are not paying for the product, there is a good chance you are part of it.',
        ],
        quote: 'If you are not paying for the product, there is a good chance you are part of it.',
        react: 'You check your phone. Thirty-one apps with location access. Oops.',
        after: 'Settings, Privacy, Location. Go. I will wait.',
      },
      local: {
        intro: ['Oh no. Is this about my delivery habit?'],
        options: [
          { label: 'Tease him', rin: 'How many orders this week?', reply: 'Eleven. It is Wednesday.' },
          { label: 'Ask seriously', rin: 'Do apps help or hurt small shops?', reply: 'Both. That is the honest answer.' },
        ],
        opinion: [
          'Apps let tiny shops reach people who would never walk past. That is real.',
          'But they take a big slice of every order. A small shop has no slice to spare.',
          'I realized I have not spoken to a shopkeeper in two months. I live two streets from all of them.',
        ],
        quote: 'I have not spoken to a shopkeeper in two months. I live two streets from all of them.',
        react: 'He looks at the ramen stall. Then back at his phone. Then at the stall.',
        after: 'Fine. I am going to Taro\'s. In person. Like a caveman.',
      },
    },
  },
  {
    id: 'taro',
    name: 'Taro Hirano',
    role: 'Ramen chef',
    district: 'alley',
    at: [1.2, -0.9, 0],
    color: '#f77f00',
    look: { skin: '#d8a27a', hair: 'short', hairColor: '#111111', top: '#ffffff', bottom: '#2b2d42', accent: '#f77f00', acc: ['headband', 'apron'], height: 1.02, build: 1.25, eye: '#2b2d42' },
    bio: 'Ramen Hirano, open 6 p.m. to 4 a.m. The broth has been simmering since 1998. Allegedly.',
    idle: [
      'Shoyu or miso? Wrong. Both.',
      'Broth takes eighteen hours. Patience takes longer.',
      'Sit! Eat! Then report!',
    ],
    interviews: {
      heat: {
        intro: ['Rin! Do not stand near the pot, you will melt.'],
        options: [
          { label: 'Ask about the kitchen', rin: 'How hot does it get back there?', reply: 'Forty-five in August. Before I light the burners.' },
          { label: 'Ask about business', rin: 'Do people still want hot ramen in summer?', reply: 'Ha! Good question. Less every year.' },
        ],
        opinion: [
          'July used to be slow for two weeks. Now it is slow for two months.',
          'I added cold noodles to the menu. My grandfather would haunt me if he saw.',
          'Heat does not only change the weather. It changes how a whole town lives and eats.',
        ],
        quote: 'Heat does not only change the weather. It changes how a whole town lives and eats.',
        react: 'Even ramen is adapting. That says something.',
        after: 'Try the cold noodles. Do not tell my grandfather.',
      },
      local: {
        intro: ['Ah! My favorite reporter. My only reporter. Sit!'],
        options: [
          { label: 'Ask about apps', rin: 'Do you use delivery apps?', reply: 'I do. I hate it. I need it.' },
          { label: 'Ask about the tofu shop', rin: 'Did you hear the tofu shop closed?', reply: 'I heard. I went to the funeral of a shop. Strange feeling.' },
        ],
        opinion: [
          'The apps bring me orders on rainy nights. Real money. I cannot pretend otherwise.',
          'But they take a big cut. And ramen does not travel well. Ten minutes in a bag and it is soup and sadness.',
          'A shop is not a building. It is the people who come back. Without them, I am just a man with a pot.',
        ],
        quote: 'A shop is not a building. It is the people who come back.',
        react: 'He hands you a bowl before you can say no. You do not say no.',
        after: 'Eat while it is hot. That is the only rule here.',
      },
    },
  },
];

// Wandering townsfolk. Random look, short lines.
export const TOWNSFOLK_LINES = [
  'Lovely day for it.',
  'Is the Herald hiring? Asking for a friend.',
  'Have you tried the taiyaki at the station?',
  'Excuse me. Oh, sorry. After you.',
  'The train is late again. Classic.',
  'My cat ran off toward the shrine. Have you seen her?',
  'I read your column! Well, my mom did.',
  'Big storm coming next week, they say.',
  'Ah, the reporter! Quote me. No, wait. Do not.',
  'Every street here goes around in a circle. I love it.',
];

// Hidden collectible notes scattered around the planet.
export const SCOOPS = [
  { lat: 70, lon: 60, title: 'Since 1965', text: 'The Herald has printed every day for 61 years. Twice it printed upside down. Nobody talks about 1983.' },
  { lat: 25, lon: 30, title: 'Star Town', text: 'Hoshimachi means Star Town. On clear nights, you will see why. Look up near the shrine.' },
  { lat: 50, lon: 150, title: '99 steps', text: 'Locals say if you climb the shrine steps without stopping, your wish comes true. Fumi has done it 4,000 times.' },
  { lat: 20, lon: 215, title: 'Hoop dreams', text: 'Someone has made exactly one basket from the bench at Hinata Park. Nobody believes him.' },
  { lat: -40, lon: 85, title: 'Glass forever', text: 'Glass can be recycled again and again without losing quality. Your bottle could be someone’s window next year.' },
  { lat: -62, lon: 60, title: 'The lighthouse', text: 'The lighthouse has not guided a ship since 1990. It stays lit anyway. The fishermen like knowing it is there.' },
  { lat: -5, lon: 160, title: 'Lantern count', text: 'There are 48 lanterns in Neon Yokocho. Taro claims he hung all of them. He did not.' },
  { lat: -30, lon: 200, title: 'Night shift', text: 'Taxi drivers, bakers, nurses and guards. Hoshimachi has a whole second town that wakes up at midnight.' },
  { lat: -5, lon: 310, title: 'Laundry signals', text: 'At Tsukimi Residences, a red towel on a balcony means come over for tea. Nobody remembers who started it.' },
  { lat: -30, lon: 280, title: 'Tree math', text: 'A large tree can move hundreds of liters of water into the air on a hot day. That is how it cools the street.' },
  { lat: 60, lon: 250, title: 'Turn it off', text: 'Most phones let you see which apps used your location this week. It takes ten seconds to check.' },
  { lat: 8, lon: 95, title: 'Say hello', text: 'Hoshimachi has a tradition. If you pass someone twice in a day, you have to say hello. It is the law. Not really.' },
];

// Interactable props.
export const PROPS = {
  vending: 'A cold can drops with a satisfying clunk. Melon soda. Of course.',
  bell: 'The shrine bell rings. Somewhere, a crow answers.',
  bench: 'Rin sits for a moment. The town keeps moving. That is okay.',
  cat: 'The cat accepts your offering of head scratches.',
};

export const ENDING = [
  'Five front pages. Twenty voices.',
  'You did not change the world this week.',
  'But a fisherman, a student and a grandmother were heard. By the whole town.',
  'That is how it starts. Someone asks. Someone answers. Someone else reads it.',
  'Keep asking, Rin.',
];
