// Korean text, by the English text it translates. See i18n.ts.
export const ko: Record<string, string> = {
  // The window and its buttons.
  Wait: '대기',
  Examine: '살펴보기',
  Log: '로그',
  Bag: '가방',
  Settings: '설정',
  Close: '닫기',
  'New game': '새 게임',
  Continue: '이어하기',
  'Main menu': '메인 메뉴로',
  Help: '도움말',
  Back: '뒤로',
  Controls: '조작',
  'Click a tile to move, attack, and more.': '타일을 클릭함으로써 이동/공격 등이 가능합니다.',
  'Pass a turn where you stand.': '제자리에서 한 턴을 넘길 수 있습니다.',
  'Learn about a tile or an enemy. Or press it again to search the area around you.':
    '타일 또는 적에 대해 알 수 있습니다. 또는 한 번 더 눌러 주변을 수색합니다.',
  'Read the messages again.': '메시지를 다시 볼 수 있습니다.',
  'Open the bag to put on your gear and use your items.':
    '가방을 열어 장비를 장착하고, 아이템을 사용할 수 있습니다.',
  'Surprise Attacks': '기습',
  'An enemy that has not seen you yet, such as one asleep or one that just came through a door or around a corner, cannot dodge your attack. Its damage keeps the same maximum but rolls from a higher minimum, so a high roll is likelier. Thrown weapons can surprise it too, but a weapon too heavy for your strength cannot.':
    '아직 이쪽을 보지 못한 적, 이를테면 잠든 적이나 방금 문이나 모퉁이에서 나타난 적은 공격을 피하지 못합니다. 피해의 최댓값은 그대로지만 최솟값이 올라가, 높은 피해가 나올 확률이 커집니다. 투척 무기로도 기습할 수 있지만, 힘이 모자라 무거운 무기로는 기습할 수 없습니다.',
  Food: '식량',
  'You get hungry as turns pass, and while hungry you stop healing over time. Open the bag and eat before you start starving, as a starving hero keeps losing HP until they eat.':
    '턴이 지날수록 배가 고파지고, 배가 고픈 동안에는 체력이 저절로 회복되지 않습니다. 굶주리기 전에 가방을 열어 음식을 먹으세요. 굶주리면 음식을 먹을 때까지 체력이 계속 줄어듭니다.',
  Potions: '물약',
  'Potions are unidentified, and their colors change from run to run. You learn what a potion is only by drinking it, or by throwing it and seeing what it does. After that, you know every potion of its kind.':
    '물약은 감정되지 않은 상태이며, 색깔은 판마다 바뀝니다. 마셔 보거나, 던져서 효과를 보기 전에는 어떤 물약인지 알 수 없습니다. 한 번 알게 되면 같은 종류의 물약은 모두 알아볼 수 있습니다.',
  Traps: '함정',
  'Traps hide in the floor and go off once, when you, an enemy, or a thrown item lands on them. Each move may find a hidden trap next to you, and searching the area around you finds every hidden trap there. A found trap is shown, so you can walk around it.':
    '함정은 바닥에 숨어 있다가, 누군가 밟거나 던진 물건이 떨어지면 한 번 작동합니다. 움직일 때마다 바로 옆의 숨은 함정을 발견할 수 있고, 주변을 수색하면 그 안의 숨은 함정을 모두 찾아냅니다. 발견한 함정은 화면에 보이므로 피해서 지나갈 수 있습니다.',
  Stairs: '계단',
  'The stairs lead down to the next floor. There is no way back up, so take what you need first. Items lying on the stairs have to be picked up before you can go down.':
    '계단을 통해 다음 층으로 내려갈 수 있습니다. 다시 올라올 수는 없으니, 필요한 것을 먼저 챙기세요. 계단 위에 놓인 아이템은 주워야 내려갈 수 있습니다.',
  'By a campfire, you can rest, which heals you over some turns, or cook raw meat. You cannot use it while an enemy is in its room, and an enemy coming in stops you. A campfire gives only one rest, but a rest cut short can be taken up again later.':
    '모닥불을 통해 쉬며 몇 턴에 걸쳐 체력을 회복하거나, 날고기를 구울 수 있습니다. 같은 방에 적이 있으면 쓸 수 없고, 적이 들어오면 하던 일이 멈춥니다. 모닥불에서는 한 번만 쉴 수 있지만, 중간에 멈춘 휴식은 나중에 이어서 쉴 수 있습니다.',
  'Strength and Gear': '힘과 장비',
  'Weapons and armor need some strength, which the bag shows. Gear too heavy for you works worse: a weapon misses more and cannot make surprise attacks, and armor lets you evade less and blocks less. Strength potions raise your strength.':
    '무기와 갑옷에는 필요한 힘이 있으며, 가방에서 확인할 수 있습니다. 힘이 모자라면 장비의 성능이 떨어집니다. 무기는 더 자주 빗나가고 기습을 할 수 없으며, 갑옷은 회피와 방어가 줄어듭니다. 힘 물약을 마시면 힘이 오릅니다.',
  'Locked Doors': '잠긴 문',
  'A locked door opens with an iron key found on the same floor. Carrying the key, you can unlock the door, and the key stays in the lock.':
    '잠긴 문은 같은 층에서 찾은 철 열쇠로 엽니다. 열쇠를 지니고 있으면 문을 열 수 있고, 열쇠는 자물쇠에 남습니다.',
  Cancel: '취소',
  Language: '언어',
  'UI scale': 'UI 크기',
  'Sound effects': '효과음',
  Music: '배경음',
  Mute: '음소거',

  // The top of the screen.
  'Floor {floor}': '{floor}층',
  'Lv {level}': '레벨 {level}',

  // The bag.
  Damage: '피해량',
  Defense: '방어력',
  Strength: '필요 힘',
  Fullness: '포만감',
  Weapon: '무기',
  'Thrown weapon': '투척 무기',
  Armor: '갑옷',
  Accessory: '장신구',
  Potion: '물약',
  Key: '열쇠',
  Equip: '장착',
  Unequip: '해제',
  Throw: '던지기',
  Drop: '버리기',
  Eat: '먹기',
  Drink: '마시기',
  'No {kind}': '{kind} 없음',
  weapon: '무기',
  armor: '방어구',
  accessory: '장신구',

  // The campfire and the signs.
  Campfire: '모닥불',
  'A warm fire crackles here. You can rest by it, or cook raw meat over it.':
    '따뜻한 불이 타닥타닥 타오른다. 불가에서 쉬거나 생고기를 구울 수 있다.',
  Rest: '휴식',
  'Recover {heal} HP over {turns} turns.': '{turns}턴에 걸쳐 체력 {heal} 회복.',
  'Cook raw meat': '생고기 굽기',
  'Cook one piece in {time}. You have {count}.': '한 조각을 {time} 만에 굽는다. {count}개 보유.',
  'one turn': '한 턴',
  '{turns} turns': '{turns}턴',
  'Not while an enemy is in the room.': '방 안에 적이 있는 동안에는 할 수 없다.',
  'Your HP is already full.': '체력이 이미 가득하다.',
  'You have already rested here.': '여기서는 이미 쉬었다.',
  'You have no raw meat.': '생고기가 없다.',
  'Examine which tile?\nPress Examine again to search the area.':
    '어느 타일을 살펴볼까?\n살펴보기를 한 번 더 누르면 주변을 수색한다.',
  Search: '수색',

  // The enemies.
  rat: '쥐',
  crab: '게',
  bat: '박쥐',
  mimic: '미믹',
  ghoul: '구울',
  ghost: '유령',
  'giant centipede': '거대 지네',
  'skeleton archer': '해골 궁수',
  necromancer: '네크로맨서',
  'Unlike the rats common in the sewers, this one is strangely large.':
    '하수구에서 흔하게 볼 수 있는 쥐...와는 다르게 크기가 이상할 정도로 크다.',
  'A crab as big as a man! One of its claws is huge.': '사람만 한 게! 한쪽 집게발이 정말 크다.',
  'A bat. It darts out and startles people. It seems to move faster than other enemies.':
    '박쥐. 갑자기 튀어나와 사람을 놀래곤 한다. 다른 적보다 행동이 빠른 것 같다.',
  'A mimic, pretending to be a chest. Where it came from and how it lives are a mystery.':
    '상자인 척하는 미믹이다. 어디서 생겨났는지, 그 생태는 어떠한지는 베일에 싸여 있다.',
  'A ghoul, found in places such as catacombs. It can drain life.':
    '지하 묘지 등에서 발견되곤 하는 구울. 체력을 흡수하는 능력이 있다.',
  'A ghost floating in the air. It can sap the strength of others.':
    '공중을 떠다니는 유령. 상대방의 힘을 약화시키는 능력이 있다.',
  'A skeleton archer that shoots annoying arrows from afar. Up close, it is easier to deal with than it looks.':
    '원거리에서 성가신 화살을 발사하는 해골 궁수. 접근한다면 의외로 처리하기는 쉽다.',
  'A centipede that has lived underground for decades. As if under some command, it devours the creatures of the sewers without mercy.':
    '지하에서 수십 년을 살아온 지네. 무언가의 명령을 받는 듯, 하수구의 생물을 무자비하게 먹어치우고 있다.',
  'The source of evil in the dungeon. It wields an unknown dark power.':
    '던전의 악의 근원. 알 수 없는 어둠의 힘을 사용한다.',

  // The items.
  'Healing potion': '치유 물약',
  'Heals a good part of your HP at once, then keeps healing you for a while.':
    '체력을 한 번에 크게 회복하고, 한동안 계속 회복한다.',
  'Strength potion': '힘 물약',
  'Raises your strength by 1, which makes all your attacks a little stronger.':
    '힘이 1 올라 모든 공격이 조금 더 강해진다.',
  'Experience potion': '경험 물약',
  'Raises your level by one.': '레벨이 1 오른다.',
  'Haste potion': '가속 물약',
  'You act twice for every turn of the enemies, for {turns} turns.':
    '{turns}턴 동안 적이 한 번 움직일 때마다 두 번 행동한다.',
  'Invisibility potion': '투명 물약',
  'Enemies cannot see you for {turns} turns, or until you attack.':
    '{turns}턴 동안, 또는 공격하기 전까지 적이 당신을 볼 수 없다.',
  'Levitation potion': '부유 물약',
  'You float for {turns} turns, above any fire on the floor.':
    '{turns}턴 동안 바닥의 불길 위로 떠오른다.',
  'Telepathy potion': '텔레파시 물약',
  'You sense every enemy on the floor for {turns} turns.':
    '{turns}턴 동안 이 층의 모든 적이 느껴진다.',
  'Fire potion': '화염 물약',
  'Bursts into flames where it breaks. Throw it at enemies.':
    '깨진 자리에서 불길이 치솟는다. 적에게 던지자.',
  'Frost potion': '서리 물약',
  'Freezes everything around where it breaks. Throw it at enemies.':
    '깨진 자리 주변의 모든 것을 얼린다. 적에게 던지자.',
  'Poison gas potion': '독가스 물약',
  'Releases poison gas where it breaks. Throw it at enemies.':
    '깨진 자리에서 독가스가 퍼진다. 적에게 던지자.',
  'Paralysis potion': '마비 물약',
  'Releases a gas that paralyzes anything in it. Throw it at enemies.':
    '닿는 것을 모두 마비시키는 가스가 퍼진다. 적에게 던지자.',
  '{color} potion': '{color} 물약',
  Red: '빨간색',
  Orange: '주황색',
  Yellow: '노란색',
  Lime: '연두색',
  Green: '초록색',
  Cyan: '청록색',
  Blue: '파란색',
  Purple: '보라색',
  Pink: '분홍색',
  Brown: '갈색',
  Black: '검은색',
  White: '흰색',
  'You do not know what this potion does. Drinking it will tell you.':
    '어떤 효과가 있는지 알 수 없는 물약이다. 마셔 보면 알 수 있다.',
  Dart: '다트',
  'A small dart for throwing at an enemy from afar. Some break when they hit.':
    '멀리서 적에게 던지는 작은 다트. 맞으면 부러지기도 한다.',
  Javelin: '투창',
  'A light spear made for throwing. It hits harder than a dart. Some break when they hit.':
    '던지기 좋게 만든 가벼운 창. 다트보다 강하다. 맞으면 부러지기도 한다.',
  'Throwing axe': '투척 도끼',
  'A hatchet balanced for throwing. It hits harder than a javelin. Some break when they hit.':
    '던지기 좋게 균형을 잡은 손도끼. 투창보다 강하다. 맞으면 부러지기도 한다.',
  'Worn shortsword': '낡은 소검',
  'A short sword, worn from use.': '오래 써서 낡은 짧은 검.',
  Longsword: '장검',
  'A long blade that hits a little harder than a shortsword.': '소검보다 조금 더 강한 긴 검.',
  Spear: '창',
  'A long spear that hits enemies up to {reach} tiles away.':
    '{reach}칸 떨어진 적까지 찌를 수 있는 긴 창.',
  Dagger: '단검',
  'A short blade that hits much harder in a surprise attack.': '기습할 때 훨씬 강해지는 짧은 칼.',
  Zweihänder: '츠바이핸더',
  'A huge two-handed sword. Few adventurers ever find one.':
    '거대한 양손검. 손에 넣은 모험가는 드물다.',
  'Cloth armor': '천 갑옷',
  'Thin padded cloth that gives a little protection.': '얇게 누빈 천. 조금은 막아 준다.',
  'Leather armor': '가죽 갑옷',
  'Hardened leather that turns aside light blows.': '가벼운 공격은 흘려보내는 단단한 가죽.',
  'Chain mail': '사슬 갑옷',
  'A shirt of linked iron rings.': '쇠고리를 엮어 만든 갑옷.',
  'Plate armor': '판금 갑옷',
  'Heavy steel plates that stop most blows.': '웬만한 공격은 막아 내는 무거운 강철판.',
  Ration: '식량',
  'A full meal of bread and dried meat.': '빵과 육포로 된 든든한 한 끼.',
  'Travel ration': '휴대 식량',
  'A small bundle of food, made to be carried. It fills you less than a ration.':
    '들고 다니기 좋게 싼 작은 음식 꾸러미. 식량보다는 덜 배부르다.',
  'Raw meat': '생고기',
  'Meat from a defeated enemy. Eating it raw may make you sick. Fire cooks it, even in your bag.':
    '쓰러뜨린 적에게서 얻은 고기. 날로 먹으면 탈이 날 수 있다. 불에 닿으면 가방 안에서도 익는다.',
  'Cooked meat': '익힌 고기',
  'Meat cooked through by fire. It is safe to eat.': '불에 잘 익힌 고기. 먹어도 안전하다.',
  'Iron key': '철 열쇠',
  'A heavy old key. Carrying it, you can unlock a locked door.':
    '묵직하고 오래된 열쇠. 가지고 있으면 잠긴 문을 열 수 있다.',
  'You are not strong enough for this weapon. You miss more and cannot surprise enemies.':
    '이 무기를 다루기에는 힘이 부족하다. 더 자주 빗나가고 기습할 수 없다.',
  'You are not strong enough for this armor. You evade less, and it blocks less.':
    '이 방어구를 입기에는 힘이 부족하다. 회피가 줄고 막아 주는 피해도 줄어든다.',

  // The log: using items.
  'Your wounds healed!': '상처가 아물었다!',
  "The {enemy}'s wounds healed!": '{enemy}의 상처가 아물었다!',
  'Your strength rose by 1!': '힘이 1 올랐다!',
  'Your level rose by 1!': '레벨이 1 올랐다!',
  'Your body suddenly felt light!': '갑자기 몸이 가벼워졌다!',
  'The {enemy} suddenly started moving fast!': '{enemy|이|가} 갑자기 빠르게 움직이기 시작했다!',
  'Your body suddenly turned invisible!': '갑자기 몸이 투명해졌다!',
  'The {enemy} suddenly turned invisible!': '{enemy|이|가} 갑자기 투명해졌다!',
  'Your body floated up into the air!': '몸이 공중으로 떠올랐다!',
  'The {enemy} floated up into the air!': '{enemy|이|가} 공중으로 떠올랐다!',
  'You can see into the minds of your enemies!': '적들의 마음이 들여다보인다!',
  'You ate the {item}.': '{item|을|를} 먹었다.',
  'Your stomach churns. The meat was bad!': '속이 뒤틀린다. 고기가 상했다!',
  "The potion's flask broke, but nothing happened.": '물약 병이 깨졌지만 아무 일도 일어나지 않았다.',
  'Something unseen was hit by the flask!': '보이지 않는 무언가가 물약 병에 맞았다!',
  'The {item} breaks.': '{item|이|가} 부러졌다.',
  'Throw the {item} where?': '{item|을|를} 어디로 던질까?',
  'You picked up {amount} gold.': '{amount}골드를 주웠다.',
  'You picked up: {item}.': '획득: {item}.',
  'The flames turned your {item} into {into}.': '불길에 {item|이|가} {into|으로|로} 변했다.',
  'The flames burned up your {item}.': '불길에 {item|이|가} 타 버렸다.',
  'The fire cooked the raw meat on the floor.': '바닥의 생고기가 불에 익었다.',

  // The log: the dungeon.
  'You entered a sewer where a foul stench hangs in the air.':
    '코를 찌르는 악취가 감도는 하수구에 들어섰다.',
  'You entered a catacomb built of smooth stone bricks.':
    '매끈한 돌 벽돌로 지어진 지하 묘지에 들어섰다.',
  Prologue: '프롤로그',
  'As a wandering hero, you heard a rumor that monsters keep pouring out of a dungeon in a remote place. You do not know what lurks in its depths, but you set out with a worn sword in hand.':
    '떠돌이 용사인 당신은 외진 곳의 던전에서 몬스터가 끊임없이 쏟아져 나온다는 소문을 들었다. 그 깊은 곳에 무엇이 도사리고 있는지는 알 수 없지만, 당신은 낡은 검 한 자루를 쥐고 길을 나섰다.',
  Begin: '시작',
  'You went down to the next floor.': '다음 층으로 내려갔다.',
  'The door is locked. You need a key to open it.': '문이 잠겨 있다. 열려면 열쇠가 필요하다.',
  'You unlocked the door with the iron key.': '철 열쇠로 문을 열었다.',
  'The water puts out the fire.': '물이 불을 껐다.',
  'Level up! Your max HP, accuracy, and evasion went up.':
    '레벨 업! 최대 체력, 명중, 회피가 올랐다.',
  'You are getting hungry.': '배가 고파지기 시작한다.',
  'You are starving! You will keep losing HP until you eat.':
    '굶주리고 있다! 무언가 먹을 때까지 체력이 계속 줄어든다.',
  'You search the area and find nothing.': '주변을 수색했지만 아무것도 찾지 못했다.',
  'You sit down by the fire to rest.': '불가에 앉아 쉰다.',
  'You feel rested.': '푹 쉬었다.',
  'The raw meat is cooked through.': '생고기가 잘 익었다.',
  resting: '휴식',
  cooking: '요리',
  'You stopped {verb}.': '{verb|을|를} 멈췄다.',
  'An enemy came into the room! You stopped {verb}.': '방에 적이 들어왔다! {verb|을|를} 멈췄다.',

  // The log: enemies and traps.
  'You defeated the {enemy}.': '{enemy|을|를} 처치했다.',
  'Something unseen attacked you.': '보이지 않는 무언가가 당신을 공격했다.',
  'You attacked an unseen enemy.': '보이지 않는 적을 공격했다.',
  'The chest bares its teeth. It was a mimic!': '상자가 이빨을 드러낸다. 미믹이었다!',
  'A {enemy} smashes its way out of a coffin!': '{enemy|이|가} 관을 부수고 나왔다!',
  'The dead crumble to dust.': '죽은 자들이 먼지로 부서진다.',
  'The giant centipede rears up and targets you!': '거대 지네가 몸을 일으켜 당신을 노린다!',
  'The giant centipede slams into you!': '거대 지네가 당신을 들이받았다!',
  'The giant centipede crashes headfirst into the wall! It is stunned!':
    '거대 지네가 벽에 머리를 들이받았다! 기절했다!',
  'The necromancer gathers dark magic!': '네크로맨서가 어둠의 마력을 모은다!',
  'The dark magic strikes you!': '어둠의 마력이 당신을 덮쳤다!',
  'The necromancer begins to chant an unknown spell!': '네크로맨서가 알 수 없는 주문을 외기 시작한다!',
  'The shield around the necromancer fades!': '네크로맨서를 감싼 보호막이 사라진다!',
  'a spike trap': '가시 함정',
  'an arrow trap': '화살 함정',
  'You found {trap}.': '{trap|을|를} 발견했다.',
  'You stepped on {trap}!': '{trap|을|를} 밟았다!',
  'Something set off {trap}!': '무언가가 {trap|을|를} 건드렸다!',
  'The {enemy} stepped on {trap}!': '{enemy|이|가} {trap|을|를} 밟았다!',
  'Spikes jab up out of the floor!': '바닥에서 가시가 솟구친다!',
  'An arrow shoots out of the floor!': '바닥에서 화살이 날아온다!',
  'An arrow shoots out of the floor and finds no one.': '바닥에서 화살이 날아왔지만 아무도 맞지 않았다.',
  'An arrow hits you!': '화살에 맞았다!',

  // Examining.
  'The {enemy} is pretending to be a chest.': '{enemy|이|가} 상자인 척하고 있다.',
  'The {enemy} is asleep.': '{enemy|이|가} 잠들어 있다.',
  'The {enemy} is wandering.': '{enemy|이|가} 돌아다니고 있다.',
  'The {enemy} is hunting you.': '{enemy|이|가} 당신을 쫓고 있다.',
  'Effects: {effects}.': '상태: {effects}.',
  'A chest. Something good may be inside. Its latch twitches now and then. Opening it could be dangerous.':
    '상자. 뭔가 좋은 게 들어 있을 수도 있다. 걸쇠가 이따금 움찔거린다. 열면 위험할지도 모른다.',
  'A chest. Something good may be inside.': '상자. 뭔가 좋은 게 들어 있을 수도 있다.',
  '{amount} gold.': '{amount}골드.',
  'An arrow trap. When it is activated, it shoots the nearest character within {range} tiles.':
    '화살 함정. 작동하면 {range}칸 안에서 가장 가까운 대상을 쏜다.',
  'A spike trap. When it is activated, it hurts whoever stands on it.':
    '가시 함정. 작동하면 위에 선 대상이 피해를 입는다.',
  'A plate that has already gone off.': '이미 작동한 발판.',
  'A wall.': '벽.',
  'An open door.': '열린 문.',
  'A closed door.': '닫힌 문.',
  'A locked door. A key would open it.': '잠긴 문. 열쇠가 있으면 열 수 있다.',
  'Stairs down to the next floor.': '다음 층으로 내려가는 계단.',
  'A campfire. From a tile next to it, you can rest or cook raw meat.':
    '모닥불. 바로 옆 타일에서 쉬거나 생고기를 구울 수 있다.',
  'Shallow water. It puts out the fire on whoever stands in it.':
    '얕은 물. 들어선 대상에게 붙은 불을 꺼 준다.',
  'A wooden coffin.': '나무 관.',
  'The stairs you came down. There is no way back up.': '내려온 계단. 다시 올라갈 길은 없다.',
  'The floor.': '바닥.',

  // The end of a run.
  'You died': '당신은 죽었다',
  'Try again': '다시 시도',
  'The dungeon is quiet.': '던전이 고요해졌다.',
  'With the necromancer gone, the monsters under his sway were cleansed, and peace returned to the dungeon. You made it safely back to the village.':
    '네크로맨서가 사라지자 그의 영향을 받던 몬스터들이 정화되어 던전에 평화가 찾아왔다. 당신은 무사히 마을로 귀환했다.',
  'Play again': '다시 플레이',
  'In {turns}, you reached floor {floor} and defeated {kills} in all.':
    '{turns} 동안 {floor}층에 도달하였으며, 총 {kills}의 적을 처치했다.',
  '{count} enemy': '{count}마리',
  '{count} enemies': '{count}마리',
  '{count} turn': '{count}턴',
  '{count} turns': '{count}턴',

  // The words that float over a character.
  Evade: '회피',
  Targeted: '표적',

  // What the hero is going through.
  Haste: '가속',
  Invisible: '투명',
  Levitating: '부유',
  Telepathy: '텔레파시',
  Paralyzed: '마비',
  Frozen: '빙결',
  Burning: '화염',
  Poisoned: '중독',
  Stunned: '기절',
  Weakened: '약화',
  Shielded: '보호막',
  Regenerating: '재생',
  Hungry: '배고픔',
  Starving: '굶주림',
  'You act twice for every turn of the enemies.': '적이 한 번 움직일 때마다 두 번 행동한다.',
  'Enemies cannot see you. Attacking ends it.': '적이 당신을 볼 수 없다. 공격하면 풀린다.',
  'You float above the floor, out of reach of fire on it.':
    '바닥 위로 떠올라 바닥의 불길이 닿지 않는다.',
  'You sense every enemy on the floor, even through walls.':
    '벽 너머까지 이 층의 모든 적이 느껴진다.',
  'You cannot act or dodge.': '행동하거나 피할 수 없다.',
  'You cannot act or dodge. Any damage breaks the ice.':
    '행동하거나 피할 수 없다. 피해를 입으면 얼음이 깨진다.',
  'Fire hurts you at the end of every turn.': '매 턴이 끝날 때마다 불에 피해를 입는다.',
  'Poison hurts you at the end of every turn, less as it wears off.':
    '매 턴이 끝날 때마다 독에 피해를 입으며, 해독될수록 줄어든다.',
  'You cannot act or dodge, dazed from a crash.': '충돌에 정신이 멍해서 행동하거나 피할 수 없다.',
  'A shield keeps anything from hurting you.': '보호막이 모든 피해를 막아 준다.',
  'Your wounds keep closing, a little at the end of every turn.':
    '매 턴이 끝날 때마다 상처가 조금씩 아문다.',
  'You feel weak. Your strength is lowered by one, so heavy gear weighs on you more.':
    '힘이 빠진다. 힘이 1 줄어서 무거운 장비가 더 버겁다.',
  'You slowly lose HP until you eat something.': '무언가 먹을 때까지 체력이 서서히 줄어든다.',
  'You need to eat. In {turns} turns without food, you start starving.':
    '먹어야 한다. 음식 없이 {turns}턴이 지나면 굶주리기 시작한다.',
  '{turns} turns left': '{turns}턴 남음',
};
