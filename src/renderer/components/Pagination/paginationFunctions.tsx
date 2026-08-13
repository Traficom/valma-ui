export const createPaginationPages = (pages: number, currentPage: number) => {
  const pageList = [];
  // How many pages can be around the current page
  const maxAround = 1;
  // How many pages are displayed if in beginning or end range
  const maxRange = 3;
  const endRange = pages - maxRange;
  // Check if we're in the starting section
  const inStartRange = currentPage <= maxRange;
  // Check if we're in the ending section
  const inEndRange = currentPage > endRange;
  let dots = 0;

  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages) {
      pageList.push(i);
    } else if (inStartRange && i <= maxRange) {
      // Show element if in start range
      pageList.push(i);
    } else if (inEndRange && i > endRange) {
      // Show the element if in ending range
      pageList.push(i);
    } else if (i === currentPage - maxAround || i === currentPage || i === currentPage + maxAround) {
      // Show element if in the wrap around
      pageList.push(i);
    } else if (dots === 0 || (!inStartRange && !inEndRange && dots < 2 && i > currentPage)) {
      dots++;
      // Insert dots after this page, we only have one or 2, and we can only insert the second one
      // if we're not in the start or end range, and it's past the current page
      pageList.push("…");
    }
  }

  return pageList;
};
