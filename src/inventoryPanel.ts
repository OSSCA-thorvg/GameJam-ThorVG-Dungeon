import { INVENTORY_SLOTS, ITEMS, type ItemContext, type ItemKind, type ItemStack } from './items';

export interface InventoryPanelOptions {
  getStacks(): ItemStack[];
  getItemContext(): ItemContext;
  onOpen(): void;
  onUse(kind: ItemKind): void;
}

export interface InventoryPanel {
  refresh(): void;
  close(): void;
}

// The inventory window. It is HTML because it is made of buttons and text.
export function createInventoryPanel({
  getStacks,
  getItemContext,
  onOpen,
  onUse,
}: InventoryPanelOptions): InventoryPanel {
  const button = document.querySelector<HTMLButtonElement>('#inventory-button')!;
  const overlay = document.querySelector<HTMLElement>('#inventory')!;
  const slots = document.querySelector<HTMLElement>('#inventory-slots')!;
  const details = document.querySelector<HTMLElement>('#inventory-details')!;
  let selected: ItemKind | null = null;

  const renderDetails = () => {
    details.replaceChildren();
    if (!selected) {
      return;
    }

    const item = ITEMS[selected];
    const kind = selected;
    const reason = item.blockedReason(getItemContext());

    const name = document.createElement('strong');
    name.textContent = item.name;
    const description = document.createElement('p');
    description.textContent = reason ?? item.description;

    const use = document.createElement('button');
    use.textContent = 'Use';
    use.disabled = reason !== null;
    use.addEventListener('click', () => onUse(kind));

    details.append(name, description, use);
  };

  const renderSlots = () => {
    const stacks = getStacks();
    slots.replaceChildren();

    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const stack = stacks[i];
      const slot = document.createElement('button');
      slot.className = 'inventory-slot';
      slot.disabled = !stack;

      if (stack) {
        slot.innerHTML = ITEMS[stack.kind].icon;
        slot.setAttribute('aria-label', `${ITEMS[stack.kind].name}, ${stack.count}`);
        slot.classList.toggle('selected', stack.kind === selected);
        if (stack.count > 1) {
          const count = document.createElement('span');
          count.textContent = String(stack.count);
          slot.append(count);
        }
        slot.addEventListener('click', () => {
          selected = stack.kind;
          renderSlots();
          renderDetails();
        });
      }
      slots.append(slot);
    }
  };

  const refresh = () => {
    const stacks = getStacks();
    if (selected && !stacks.some((stack) => stack.kind === selected)) {
      selected = stacks[0]?.kind ?? null;
    }
    renderSlots();
    renderDetails();
  };

  const close = () => {
    overlay.hidden = true;
  };

  button.addEventListener('click', () => {
    onOpen();
    selected = getStacks()[0]?.kind ?? null;
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
