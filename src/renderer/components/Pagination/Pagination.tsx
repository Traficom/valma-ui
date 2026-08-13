import { MouseEvent, useEffect, useState } from "react";
import { createPaginationPages } from "./paginationFunctions";
import './Pagination.css'

export interface PaginationProps {
  ariaLabel?: string;
  currentPage?: number;
  onClick?: (page: number) => void;
  pages?: number;
  paginationId?: string;
}

export const combineClasses = (classes: string[]): string => {
  return classes.filter((x) => x).join(" ");
};

/**
 * Primary UI component for user interaction
 */
export const Pagination = ({
  ariaLabel,
  currentPage = 1,
  onClick,
  pages = 1,
  paginationId,
}: PaginationProps) => {
  const [current, setCurrent] = useState(currentPage);
  const [pageList, setPageList] = useState<(string | number)[]>([]);

  useEffect(() => {
    const newPageList = createPaginationPages(pages, current);
    setPageList(newPageList);
  }, [pages, current]);

  const handleClick = (event: MouseEvent, page: number) => {
    event.preventDefault();
    setCurrent(page);
    if (onClick) {
      onClick(page);
    }
  };

  return (
    <nav
      id="pagination_component"
      className="tds-pagination"
      aria-label={ariaLabel}
    >
      <div className="prev-button">
           <div className="next-button">
              <button
                   onClick={(event: MouseEvent) => handleClick(event, current - 1)}>
                  <span>Edellinen</span>
              </button>
          </div>
      </div>
      <ul className="page-numbers">
        {pageList.map((page, index) => {
          if (typeof page === "string")
            return (
              <li key={"page-" + index}>
                <span
                  aria-hidden="true"
                  className="ellipsis"
                >
                  {page}
                </span>
                <span className="sr-only">.</span>
              </li>
            );
          const classes = combineClasses(["page-number semi_bold", page === current ? "current-page" : ""]);
          return (
            <li key={"page-" + index}>
              <a
                id={paginationId ? `${paginationId}-page-${page}` : undefined}
                aria-current={page === current ? "page" : "false"}
                aria-label={`Sivu ${page}`}
                className={classes}
                href="/#"
                onClick={(event: MouseEvent) => handleClick(event, page)}
              >
                {page}
              </a>
            </li>
          );
        })}
      </ul>
          <div className="next-button">
              <button
                  onClick={(event: MouseEvent) => handleClick(event, current + 1)}>
                  <span>Seuraava</span>
              </button>
          </div>
    </nav>
  );
};