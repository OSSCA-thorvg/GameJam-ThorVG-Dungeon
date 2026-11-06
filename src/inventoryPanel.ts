import { INVENTORY_SLOTS, ITEMS, type ItemContext, type ItemName, type ItemStack } from './items';

export interface InventoryPanelOptions {
  getStacks(): ItemStack[];
  getItemContext(): ItemContext;
  onOpen(): void;
  onUse(name: ItemName): void;
  onThrow(name: ItemName): void;
  onDrop(name: ItemName): void;
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
  onThrow,
  onDrop,
}: InventoryPanelOptions): InventoryPanel {
  const button = document.querySelector<HTMLButtonElement>('#inventory-button')!;
  const overlay = document.querySelector<HTMLElement>('#inventory')!;
  const slots = document.querySelector<HTMLElement>('#inventory-slots')!;
  const details = document.querySelector<HTMLElement>('#inventory-details')!;
  let selected: ItemName | null = null;

  const renderDetails = () => {
    details.replaceChildren();
    if (!selected) {
      return;
    }

    const item = ITEMS[selected];
    const name = selected;
    const reason = item.blockedReason(getItemContext());

    const title = document.createElement('strong');
    title.textContent = item.displayName;
    const description = document.createElement('p');
    description.textContent = reason ?? item.description;

    const actionButton = (label: string, onClick: () => void) => {
      const element = document.createElement('button');
      element.textContent = label;
      element.addEventListener('click', onClick);
      return element;
    };
    const use = actionButton(item.useLabel, () => onUse(name));
    use.disabled = reason !== null;

    const actions = document.createElement('div');
    actions.className = 'inventory-actions';
    actions.append(use, actionButton('Throw', () => onThrow(name)), actionButton('Drop', () => onDrop(name)));
    details.append(title, description, actions);
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
        slot.innerHTML = ITEMS[stack.name].icon;
        slot.setAttribute('aria-label', `${ITEMS[stack.name].displayName}, ${stack.count}`);
        slot.classList.toggle('selected', stack.name === selected);
        if (stack.count > 1) {
          const count = document.createElement('span');
          count.textContent = String(stack.count);
          slot.append(count);
        }
        slot.addEventListener('click', () => {
          selected = stack.name;
          renderSlots();
          renderDetails();
        });
      }
      slots.append(slot);
    }
  };

  const refresh = () => {
    const stacks = getStacks();
    if (selected && !stacks.some((stack) => stack.name === selected)) {
      selected = stacks[0]?.name ?? null;
    }
    renderSlots();
    renderDetails();
  };

  const close = () => {
    overlay.hidden = true;
  };

  button.addEventListener('click', () => {
    onOpen();
    selected = getStacks()[0]?.name ?? null;
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
