import { MouseEvent, useEffect, useState } from "react";
import { createPaginationPages } from "./paginationFunctions";
import './Pagination.css'

export interface PaginationProps {
  ariaLabel?: string;
  currentPage?: number;
  setPage?: (page: number) => void;
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
  currentPage,
  setPage,
  pages,
  paginationId,
}: PaginationProps) => {
  const [pageList, setPageList] = useState<(string | number)[]>([]);

  useEffect(() => {
    const newPageList = createPaginationPages(pages, currentPage);
    setPageList(newPageList);
  }, [pages, currentPage]);

  const handleClick = (event: MouseEvent, page: number) => {
    event.preventDefault();
    if (page) {
      setPage(page);
    }
  };

  return (
    <nav
      id="pagination_component"
      className="pagination-nav"
      aria-label={ariaLabel}
    >
      <div className="prev-button">
           <div className="next-button">
              <button
                   disabled={currentPage === pageList[0]}
                   onClick={(event: MouseEvent) => handleClick(event, currentPage - 1)}>
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
              </li>
            );
          const classes = combineClasses(["page-number semi_bold", page === currentPage ? "current-page" : ""]);
          return (
            <li key={"page-" + index}>
              <a
                id={paginationId ? `${paginationId}-page-${page}` : undefined}
                aria-current={page === currentPage ? "page" : "false"}
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
                  disabled={currentPage === pageList.length}
                  onClick={(event: MouseEvent) => handleClick(event, currentPage + 1)}>
                  <span>Seuraava</span>
              </button>
          </div>
    </nav>
  );
};