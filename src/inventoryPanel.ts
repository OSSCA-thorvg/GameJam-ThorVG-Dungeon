import {
  EQUIPMENT_ICONS,
  EQUIPMENT_SLOTS,
  INVENTORY_SLOTS,
  ITEMS,
  type Equipment,
  type EquipmentSlot,
  type ItemName,
  type ItemStack,
} from './items';

// How an item looks in the bag, which hides what an unidentified potion is.
export interface ItemDescription {
  displayName: string;
  description: string;
  icon: string;
  // Why the item cannot be used right now, if there is a reason.
  blockedReason: string | null;
}

export interface InventoryPanelOptions {
  getStacks(): ItemStack[];
  getEquipment(): Equipment;
  describeItem(name: ItemName): ItemDescription;
  onOpen(): void;
  onUse(name: ItemName): void;
  onEquip(name: ItemName): void;
  onUnequip(slot: EquipmentSlot): void;
  onThrow(name: ItemName): void;
  onDrop(name: ItemName): void;
}

export interface InventoryPanel {
  refresh(): void;
  close(): void;
}

type Selection = { from: 'bag'; name: ItemName } | { from: 'equipment'; slot: EquipmentSlot };

// The inventory window, with the equipment slots above the bag. It is HTML because it is made of
// buttons and text.
export function createInventoryPanel({
  getStacks,
  getEquipment,
  describeItem,
  onOpen,
  onUse,
  onEquip,
  onUnequip,
  onThrow,
  onDrop,
}: InventoryPanelOptions): InventoryPanel {
  const button = document.querySelector<HTMLButtonElement>('#inventory-button')!;
  const overlay = document.querySelector<HTMLElement>('#inventory')!;
  const equipmentSlots = document.querySelector<HTMLElement>('#equipment-slots')!;
  const slots = document.querySelector<HTMLElement>('#inventory-slots')!;
  const details = document.querySelector<HTMLElement>('#inventory-details')!;
  let selected: Selection | null = null;

  const selectedName = (): ItemName | null => {
    if (!selected) {
      return null;
    }
    return selected.from === 'bag' ? selected.name : getEquipment()[selected.slot];
  };

  const actionButton = (label: string, onClick: () => void) => {
    const element = document.createElement('button');
    element.textContent = label;
    element.addEventListener('click', onClick);
    return element;
  };

  const renderDetails = () => {
    details.replaceChildren();
    const name = selectedName();
    if (!selected || !name) {
      return;
    }

    const item = ITEMS[name];
    const look = describeItem(name);
    const reason = look.blockedReason;

    const title = document.createElement('strong');
    title.textContent = look.displayName;
    const description = document.createElement('p');
    description.textContent = reason ?? look.description;
    const stats = [
      item.damage && `Damage: ${item.damage[0]}-${item.damage[1]}`,
      item.armor && `Armor: ${item.armor[0]}-${item.armor[1]}`,
      item.strength !== undefined ? `Strength: ${item.strength}` : undefined,
    ].filter((line) => line !== undefined);
    const statLines = stats.map((line) => {
      const element = document.createElement('p');
      element.className = 'item-stat';
      element.textContent = line;
      return element;
    });

    const actions = document.createElement('div');
    actions.className = 'inventory-actions';
    if (selected.from === 'equipment') {
      const slot = selected.slot;
      actions.append(actionButton('Unequip', () => onUnequip(slot)));
    } else {
      if (item.useLabel) {
        const use = actionButton(item.useLabel, () => onUse(name));
        use.disabled = reason !== null;
        actions.append(use);
      }
      if (item.equipKind) {
        actions.append(actionButton('Equip', () => onEquip(name)));
      }
      actions.append(actionButton('Throw', () => onThrow(name)), actionButton('Drop', () => onDrop(name)));
    }
    details.append(title, description, ...statLines, actions);
  };

  const renderSlot = (name: ItemName | null, isSelected: boolean, onSelect: () => void) => {
    const slot = document.createElement('button');
    slot.className = 'inventory-slot';
    slot.disabled = !name;
    if (name) {
      slot.innerHTML = describeItem(name).icon;
      slot.classList.toggle('selected', isSelected);
      slot.addEventListener('click', () => {
        onSelect();
        renderSlots();
        renderDetails();
      });
    }
    return slot;
  };

  const renderSlots = () => {
    const equipment = getEquipment();
    equipmentSlots.replaceChildren();
    for (const { slot, kind } of EQUIPMENT_SLOTS) {
      const name = equipment[slot];
      const element = renderSlot(
        name,
        selected?.from === 'equipment' && selected.slot === slot,
        () => (selected = { from: 'equipment', slot }),
      );
      if (name) {
        element.setAttribute('aria-label', describeItem(name).displayName);
      } else {
        // An empty slot shows a faint picture of what goes in it.
        element.innerHTML = EQUIPMENT_ICONS[kind];
        element.classList.add('empty-equipment');
        element.setAttribute('aria-label', `No ${kind}`);
      }
      equipmentSlots.append(element);
    }

    const stacks = getStacks();
    slots.replaceChildren();
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const stack = stacks[i];
      const element = renderSlot(
        stack?.name ?? null,
        selected?.from === 'bag' && selected.name === stack?.name,
        () => (selected = { from: 'bag', name: stack.name }),
      );
      if (stack) {
        const { displayName } = describeItem(stack.name);
        element.setAttribute('aria-label', `${displayName}, ${stack.count}`);
        if (stack.count > 1) {
          const count = document.createElement('span');
          count.textContent = String(stack.count);
          element.append(count);
        }
      }
      slots.append(element);
    }
  };

  // Selects the first item in the bag, or the first equipped item when the bag is empty.
  const selectFirst = () => {
    const stack = getStacks()[0];
    const slot = EQUIPMENT_SLOTS.find(({ slot }) => getEquipment()[slot])?.slot;
    selected = stack
      ? { from: 'bag', name: stack.name }
      : slot
        ? { from: 'equipment', slot }
        : null;
  };

  const refresh = () => {
    // The selected item may have been used up, dropped, or moved between the bag and a slot.
    const name = selectedName();
    const isStillThere =
      selected?.from !== 'bag' || getStacks().some((stack) => stack.name === name);
    if (!name || !isStillThere) {
      selectFirst();
    }
    renderSlots();
    renderDetails();
  };

  const close = () => {
    overlay.hidden = true;
  };

  button.addEventListener('click', () => {
    onOpen();
    selectFirst();
    refresh();
    overlay.hidden = false;
  });
  document.querySelector('#inventory-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  button.hidden = false;
  refresh();
  return { refresh, close };
}
