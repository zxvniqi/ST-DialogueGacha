// A select box whose options unfold right below it (scrolling inside when long),
// instead of the phone's native option popup. Options can be grouped and previewed in a font.

/**
 * @typedef {{ value: string, label: string, group?: string, fontFamily?: string }} InlineOption
 * @param {{ options: InlineOption[], value: string, onChange: (value: string) => void, onOpen?: () => void }} config
 * @returns {HTMLElement}
 */
export function createInlineSelect({ options, value, onChange, onOpen }) {
    const root = document.createElement('div');
    root.className = 'stdg_select';
    root.innerHTML = `
        <div class="stdg_select_box text_pole" tabindex="0"><span></span><i class="fa-solid fa-chevron-down"></i></div>
        <div class="stdg_select_list" hidden></div>`;
    const box = root.querySelector('.stdg_select_box');
    const label = box.querySelector('span');
    const list = root.querySelector('.stdg_select_list');

    let currentGroup = null;
    for (const option of options) {
        if (option.group && option.group !== currentGroup) {
            currentGroup = option.group;
            const header = document.createElement('div');
            header.className = 'stdg_select_group';
            header.textContent = option.group;
            list.append(header);
        }
        const item = document.createElement('div');
        item.className = 'stdg_select_item';
        item.dataset.value = option.value;
        item.textContent = option.label;
        if (option.fontFamily) {
            item.style.fontFamily = option.fontFamily;
        }
        list.append(item);
    }

    const select = (next) => {
        value = next;
        label.textContent = options.find(option => option.value === value)?.label ?? options[0]?.label ?? '';
        for (const item of list.querySelectorAll('.stdg_select_item')) {
            item.classList.toggle('stdg_selected', item.dataset.value === value);
        }
    };
    const onOutside = (event) => {
        if (!root.contains(event.target)) {
            setOpen(false);
        }
    };
    const setOpen = (open) => {
        list.hidden = !open;
        root.classList.toggle('stdg_open', open);
        if (open) {
            onOpen?.();
            document.addEventListener('pointerdown', onOutside, true);
            list.querySelector('.stdg_selected')?.scrollIntoView({ block: 'nearest' });
        } else {
            document.removeEventListener('pointerdown', onOutside, true);
        }
    };

    box.addEventListener('click', () => setOpen(list.hidden));
    list.addEventListener('click', (event) => {
        const item = event.target.closest('.stdg_select_item');
        if (!item) {
            return;
        }
        select(item.dataset.value);
        setOpen(false);
        onChange(value);
    });

    select(value);
    return root;
}
