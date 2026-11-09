import { useState } from "react";

export interface CardData {
  _id?: string;
  playerName?: string;
  teamName?: string;
  cardValue?: number;
  publisher?: string;
  userId?: string;
  card?: string;
}

interface CardListProps {
  cards: CardData[];
  initialItemsPerPage?: number;
  onDelete?: (id: string) => void;
  onEdit?: (card: CardData) => void;
}

function CardList({ cards, initialItemsPerPage = 4, onDelete, onEdit }: CardListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [prevCards, setPrevCards] = useState(cards);

  // Reset to page 1 during render if the cards reference changes
  if (cards !== prevCards) {
    setPrevCards(cards);
    setCurrentPage(1);
  }

  if (!cards || cards.length === 0) {
    return null;
  }

  const totalItems = cards.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentCards = cards.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div id="cardListContainer" className="mt-4">
      {/* Header and Controls */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom">
        <span className="fw-semibold text-secondary small">
          Showing <strong>{totalItems > 0 ? startIndex + 1 : 0}–{endIndex}</strong> of <strong>{totalItems}</strong> card(s)
        </span>

        <div className="d-flex align-items-center gap-2">
          <label htmlFor="itemsPerPageSelect" className="form-label mb-0 small text-secondary fw-medium">
            Per page:
          </label>
          <select
            id="itemsPerPageSelect"
            className="form-select form-select-sm w-auto"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={6}>6</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
          </select>
        </div>
      </div>

      {/* Paginated Cards Grid */}
      <div className="row row-cols-1 row-cols-sm-2 g-3 mb-3">
        {currentCards.map((item, index) => {
          const title = item.playerName || item.card || "Untitled Card";
          return (
            <div key={item._id || `${startIndex + index}`} className="col">
              <div className="card h-100 border shadow-sm rounded-3">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h3 className="h6 fw-bold text-body-emphasis mb-0 text-truncate">
                      <i className="bi bi-award-fill text-primary me-2" aria-hidden="true"></i>
                      {title}
                    </h3>
                    {onDelete && (
                      <button
                        className="btn btn-outline-danger btn-sm border-0 p-0"
                        onClick={() => onDelete(item._id!)}
                        aria-label="Delete Card"
                      >
                        <i className="bi bi-trash3-fill" aria-hidden="true"></i>
                      </button>
                    )}
                    {onEdit && (
                      <button
                        className="btn btn-outline-primary btn-sm border-0 p-0 ms-1"
                        onClick={() => onEdit(item)}
                        aria-label="Edit Card"
                      >
                        <i className="bi bi-pencil-square" aria-hidden="true"></i>
                      </button>
                    )}
                  </div>

                  {item.teamName && (
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle me-1 mb-2">
                      <i className="bi bi-shield me-1" aria-hidden="true"></i>
                      {item.teamName}
                    </span>
                  )}

                  <div className="small text-secondary mt-2">
                    {item.publisher && (
                      <div className="d-flex align-items-center mb-1">
                        <i className="bi bi-building text-muted me-2" aria-hidden="true"></i>
                        <span>Publisher: <strong>{item.publisher}</strong></span>
                      </div>
                    )}

                    {item.cardValue !== undefined && item.cardValue !== null && (
                      <div className="d-flex align-items-center text-success fw-semibold mt-1">
                        <i className="bi bi-tag-fill me-2" aria-hidden="true"></i>
                        <span>Value: ${typeof item.cardValue === "number" ? item.cardValue.toFixed(2) : item.cardValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav aria-label="Card search results pagination" className="d-flex justify-content-center mt-3">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${validCurrentPage === 1 ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => goToPage(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                aria-label="Previous page"
              >
                <i className="bi bi-chevron-left me-1" aria-hidden="true"></i>
                Prev
              </button>
            </li>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <li
                key={pageNum}
                className={`page-item ${pageNum === validCurrentPage ? "active" : ""}`}
              >
                <button
                  type="button"
                  className="page-link"
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </button>
              </li>
            ))}

            <li className={`page-item ${validCurrentPage === totalPages ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => goToPage(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                aria-label="Next page"
              >
                Next
                <i className="bi bi-chevron-right ms-1" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

export default CardList;
