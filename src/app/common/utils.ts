export function scrollIntoViewIfNeeded(
  type: string,
  selectedClass = 'p-datatable-row-selected',
  direction = false
) {
  const listRoots = Array.from(document.querySelectorAll<HTMLElement>('[data-jetti-list]'));
  const matchingRoots = listRoots.filter(element => element.dataset.jettiList === type);
  const listRoot = [...matchingRoots].reverse().find(element => element.getClientRects().length > 0) ||
    matchingRoots[matchingRoots.length - 1] ||
    document.getElementById(type);
  const scope = listRoot || document;
  const rows = Array.from(scope.getElementsByClassName(`scrollTo-${type}`)) as HTMLElement[];
  const selectedRows = rows.filter(row =>
    [selectedClass, 'p-datatable-row-selected', 'p-treetable-row-selected']
      .some(className => row.classList.contains(className))
  );
  const target = selectedRows[selectedRows.length - 1] || rows[0];
  const scrollElement = listRoot?.querySelector<HTMLElement>(
    '.p-datatable-table-container, .p-treetable-table-container'
  );

  if (!(target && scrollElement)) return;

  const targetRect = target.getBoundingClientRect();
  const scrollRect = scrollElement.getBoundingClientRect();
  const isOutsideViewport = targetRect.bottom > scrollRect.bottom || targetRect.top < scrollRect.top;

  if (isOutsideViewport || direction) {
    target.scrollIntoView({ block: direction ? 'end' : 'nearest', inline: 'nearest' });
  }
}

export function MaxTextWidth(text: string[], fontsize: number) {
  return text.map(e => e.split('').length).sort()[0] * fontsize;
}

export function isEqualObjects(object1: Object, object2: Object): boolean {
  const keysObject1 = Object.keys(object1);
  const keysObject2 = Object.keys(object2);
  if (keysObject1.length !== keysObject2.length ||
    keysObject1.join().length !== keysObject2.join().length)
    return false;
  keysObject1.forEach(keyObj1 => {
    if (!keysObject2.includes(keyObj1) ||
      object1[keyObj1] !== object2[keyObj1]) return false;
  });
  return true;
}

export function addMonths(date: Date, months: number) {
  const d = date.getDate();
  date.setMonth(date.getMonth() + +months);
  if (date.getDate() != d)
    date.setDate(0);
  return date;
}

export const copyToClipboard = (str: string) => {
  const el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  // eslint-disable-next-line import/no-deprecated
  document.execCommand('copy');
  document.body.removeChild(el);
};

export const numberToMoneyString = (number: number) => number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ').replace('.', ',');

// export function newGUID() {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
//     const r = Math.random() * 16 | 0;
//     const v = (c == 'x') ? r : (r & 0x3 | 0x8);
//     return v.toString(16);
//   });
// }
