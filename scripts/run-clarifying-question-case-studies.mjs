const cases = [
  {
    name: 'Eric + Kara',
    rounds: [
      ['What time and location do you already know for welcome drinks and the wedding? Feel free to skip anything not finalized yet.'],
      [],
      [],
    ],
  },
  {
    name: 'Nina + Eli',
    rounds: [
      ['What time and location do you already know for the ceremony and dinner? Feel free to skip anything not finalized yet.'],
      [],
      [],
    ],
  },
  {
    name: 'Brooke + Emma',
    rounds: [
      ['What time and location do you already know for welcome dinner and the wedding? Feel free to skip anything not finalized yet.', 'What’s one thing that feels very “you two” that you’d want reflected on the site?'],
      [],
      [],
    ],
  },
  {
    name: 'Maya + Jules',
    rounds: [
      ['What time and location do you already know for the ceremony and dinner? Feel free to skip anything not finalized yet.', 'What’s one thing that feels very “you two” that you’d want reflected on the site?'],
      [],
      [],
    ],
  },
  {
    name: 'Leah + Sofia',
    rounds: [
      ['What time and location do you already know for welcome drinks and the wedding? Feel free to skip anything not finalized yet.', 'What should guests expect from the weekend overall?'],
      [],
      [],
    ],
  },
  {
    name: 'Ava + Ben',
    rounds: [
      ['What time and location do you already know for the wedding and brunch? Feel free to skip anything not finalized yet.', 'What should guests expect from the weekend overall?'],
      ['Is there anything guests might be confused about or need extra guidance on?'],
      [],
    ],
  },
  {
    name: 'Olivia + Harper',
    rounds: [
      ['What events are actually happening across the weekend, even if rough?', 'Is there anything guests might be confused about or need extra guidance on?'],
      ['What should guests expect from the weekend overall?'],
      [],
    ],
  },
  {
    name: 'Zane + Luca',
    rounds: [
      ['What events are actually happening across the weekend, even if rough?', 'What should guests expect from the weekend overall?'],
      ['Are most guests traveling in, or are they mostly local?'],
      [],
    ],
  },
  {
    name: 'Chloe + Ben',
    rounds: [
      ['What time and location do you already know for rehearsal dinner and the wedding? Feel free to skip anything not finalized yet.'],
      [],
      [],
    ],
  },
  {
    name: 'Aaliyah + Marcus',
    rounds: [
      ['What time and location do you already know for welcome cocktails and the wedding? Feel free to skip anything not finalized yet.', 'What should guests expect from the weekend overall?'],
      [],
      [],
    ],
  },
  {
    name: 'Hannah + Drew',
    rounds: [
      ['What events are actually happening around the wedding, and which ones should guests know about?', 'What should guests expect from the weekend overall?'],
      ['Is there anything guests might be confused about or need extra guidance on?'],
      [],
    ],
  },
  {
    name: 'Keira + Alex',
    rounds: [
      ['What time and location do you already know for welcome party and the wedding? Feel free to skip anything not finalized yet.', 'Why did you pick this location?'],
      [],
      [],
    ],
  },
  {
    name: 'Noah + Tyler',
    rounds: [
      ['What time and location do you already know for welcome drinks and the wedding? Feel free to skip anything not finalized yet.', 'What city were you in when you finally met in person?'],
      [],
      [],
    ],
  },
  {
    name: 'Sophie + Daniel',
    rounds: [
      ['What events are actually happening around the wedding, and which ones should guests know about?', 'Do you want to guide guests at all on gifts or keep it open?'],
      [],
      [],
    ],
  },
];

for (const item of cases) {
  console.log(`\n# ${item.name}`);
  item.rounds.forEach((round, index) => {
    console.log(`Round ${index + 1}:`);
    if (round.length === 0) {
      console.log('- none');
      return;
    }
    for (const question of round) {
      console.log(`- ${question}`);
    }
  });
}
