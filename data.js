// Word-building patterns + kid-friendly example words (3 are shown per slide).
window.PS_DATA = {
  suffixes: {
    er:   { pos: ['verb', 'adjective'], gloss: 'a person or thing that does the action', ex: [
      ['screwdriver', 'screw + drive + er', '🪛'], ['teacher', 'teach + er', '👩‍🏫'], ['painter', 'paint + er', '🎨'],
      ['driver', 'drive + er', '🚗'], ['swimmer', 'swim + er', '🏊'], ['toaster', 'toast + er', '🍞'],
      ['singer', 'sing + er', '🎤'], ['farmer', 'farm + er', '🧑‍🌾'], ['hanger', 'hang + er', '🧥'],
      ['charger', 'charge + er', '🔌'], ['baker', 'bake + er', '🧁'], ['eraser', 'erase + er', '✏️']] },
    or:   { pos: ['verb'], gloss: 'a person who does the action', ex: [
      ['actor', 'act + or', '🎭'], ['visitor', 'visit + or', '🧳'], ['director', 'direct + or', '🎬'],
      ['inventor', 'invent + or', '💡'], ['sailor', 'sail + or', '⛵']] },
    ful:  { pos: ['noun', 'verb'], gloss: 'full of', ex: [
      ['helpful', 'help + ful', '🤝'], ['colorful', 'color + ful', '🌈'], ['joyful', 'joy + ful', '😄'],
      ['powerful', 'power + ful', '💪'], ['beautiful', 'beauty + ful', '🌸'], ['careful', 'care + ful', '⚠️']] },
    less: { pos: ['noun', 'verb'], gloss: 'without', ex: [
      ['fearless', 'fear + less', '🦁'], ['endless', 'end + less', '♾️'], ['sleepless', 'sleep + less', '😴'],
      ['useless', 'use + less', '🗑️'], ['painless', 'pain + less', '🩹']] },
    ness: { pos: ['adjective'], gloss: 'the state of being', ex: [
      ['kindness', 'kind + ness', '💛'], ['happiness', 'happy + ness', '😊'], ['darkness', 'dark + ness', '🌑'],
      ['sadness', 'sad + ness', '😢'], ['softness', 'soft + ness', '🧸']] },
    ment: { pos: ['verb'], gloss: 'the act or result of', ex: [
      ['movement', 'move + ment', '🕺'], ['agreement', 'agree + ment', '🤝'], ['excitement', 'excite + ment', '🎉'],
      ['enjoyment', 'enjoy + ment', '🎡'], ['payment', 'pay + ment', '💳']] },
    able: { pos: ['verb'], gloss: 'can be done', ex: [
      ['washable', 'wash + able', '🧼'], ['breakable', 'break + able', '🔨'], ['drinkable', 'drink + able', '🥤'],
      ['readable', 'read + able', '📖'], ['enjoyable', 'enjoy + able', '🎠']] },
    ly:   { pos: ['adjective'], gloss: 'in a ___ way', ex: [
      ['quickly', 'quick + ly', '🐇'], ['slowly', 'slow + ly', '🐢'], ['loudly', 'loud + ly', '📢'],
      ['happily', 'happy + ly', '😊'], ['softly', 'soft + ly', '🪶']] },
    ion:  { pos: ['verb'], gloss: 'the act or result of', ex: [
      ['decoration', 'decorate + ion', '🎊'], ['invitation', 'invite + ation', '💌'], ['collection', 'collect + ion', '🐚'],
      ['creation', 'create + ion', '🖌️'], ['celebration', 'celebrate + ion', '🥳']] },
    ist:  { pos: ['noun'], gloss: 'a person who does or makes', ex: [
      ['artist', 'art + ist', '🎨'], ['pianist', 'piano + ist', '🎹'], ['cyclist', 'cycle + ist', '🚴'],
      ['scientist', 'science + ist', '🔬'], ['dentist', 'dent + ist', '🦷']] },
    ish:  { pos: ['noun', 'adjective'], gloss: 'a bit / like', ex: [
      ['reddish', 'red + ish', '🍎'], ['childish', 'child + ish', '🧒'], ['foolish', 'fool + ish', '🤪'],
      ['greenish', 'green + ish', '🍏']] },
    y:    { pos: ['noun'], gloss: 'full of / like', ex: [
      ['sunny', 'sun + y', '☀️'], ['rainy', 'rain + y', '🌧️'], ['cloudy', 'cloud + y', '☁️'],
      ['windy', 'wind + y', '🌬️'], ['snowy', 'snow + y', '❄️'], ['funny', 'fun + y', '🤡']] },
  },
  prefixes: {
    un:    { gloss: 'not / opposite', ex: [['unhappy', 'un + happy', '😞'], ['unlock', 'un + lock', '🔓'], ['undo', 'un + do', '↩️'], ['unkind', 'un + kind', '😠'], ['unpack', 'un + pack', '🧳']] },
    re:    { gloss: 'again', ex: [['replay', 're + play', '🔁'], ['rewrite', 're + write', '✍️'], ['rebuild', 're + build', '🏗️'], ['reuse', 're + use', '♻️'], ['retell', 're + tell', '🗣️']] },
    dis:   { gloss: 'not / opposite', ex: [['dislike', 'dis + like', '👎'], ['disagree', 'dis + agree', '🙅'], ['disappear', 'dis + appear', '🪄'], ['disconnect', 'dis + connect', '🔌']] },
    mis:   { gloss: 'wrongly', ex: [['misspell', 'mis + spell', '❌'], ['misplace', 'mis + place', '🔍'], ['misread', 'mis + read', '📖'], ['misunderstand', 'mis + understand', '🤷']] },
    pre:   { gloss: 'before', ex: [['preview', 'pre + view', '👀'], ['preheat', 'pre + heat', '🔥'], ['preschool', 'pre + school', '🏫'], ['prepay', 'pre + pay', '💵']] },
    over:  { gloss: 'too much / above', ex: [['overflow', 'over + flow', '🌊'], ['overeat', 'over + eat', '🍔'], ['overheat', 'over + heat', '🥵'], ['overcoat', 'over + coat', '🧥']] },
    under: { gloss: 'below / not enough', ex: [['underwater', 'under + water', '🐠'], ['underline', 'under + line', '➖'], ['underground', 'under + ground', '🚇'], ['undercook', 'under + cook', '🍳']] },
    out:   { gloss: 'outside / more than', ex: [['outdoor', 'out + door', '🌳'], ['outside', 'out + side', '🚪'], ['outline', 'out + line', '✏️'], ['outrun', 'out + run', '🏃']] },
    non:   { gloss: 'not', ex: [['nonstop', 'non + stop', '⏩'], ['nonfiction', 'non + fiction', '📚'], ['nonsense', 'non + sense', '🤪']] },
    de:    { gloss: 'remove / reverse', ex: [['defrost', 'de + frost', '❄️'], ['decode', 'de + code', '🔐'], ['defog', 'de + fog', '🌫️']] },
    sub:   { gloss: 'under', ex: [['submarine', 'sub + marine', '🚢'], ['subway', 'sub + way', '🚇'], ['subtitle', 'sub + title', '💬']] },
    inter: { gloss: 'between', ex: [['internet', 'inter + net', '🌐'], ['international', 'inter + national', '🌍'], ['interact', 'inter + act', '🤝']] },
    super: { gloss: 'above / extra', ex: [['superhero', 'super + hero', '🦸'], ['supermarket', 'super + market', '🛒'], ['superstar', 'super + star', '⭐']] },
    mid:   { gloss: 'middle', ex: [['midnight', 'mid + night', '🌙'], ['midday', 'mid + day', '☀️'], ['midway', 'mid + way', '🛣️']] },
    fore:  { gloss: 'before / front', ex: [['forecast', 'fore + cast', '🌦️'], ['forehead', 'fore + head', '🙂'], ['foresee', 'fore + see', '🔮']] },
    semi:  { gloss: 'half', ex: [['semicircle', 'semi + circle', '◗'], ['semifinal', 'semi + final', '🏆']] },
  },
  compound: { gloss: 'two words joined to make a new word', ex: [
    ['toothbrush', 'tooth + brush', '🪥'], ['sunflower', 'sun + flower', '🌻'], ['notebook', 'note + book', '📓'],
    ['snowman', 'snow + man', '⛄'], ['rainbow', 'rain + bow', '🌈'], ['football', 'foot + ball', '⚽'],
    ['butterfly', 'butter + fly', '🦋'], ['firework', 'fire + work', '🎆'], ['classroom', 'class + room', '🏫'],
    ['raincoat', 'rain + coat', '🧥'], ['cupcake', 'cup + cake', '🧁'], ['backpack', 'back + pack', '🎒'],
    ['starfish', 'star + fish', '⭐'], ['bookshelf', 'book + shelf', '📚'], ['sandcastle', 'sand + castle', '🏰']] },
};
