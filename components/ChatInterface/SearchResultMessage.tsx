import type { SearchResultItem } from '@/lib/types/n8n';
import styles from './ChatInterface.module.css';

interface SearchResultMessageProps {
  items: SearchResultItem[];
  totalCount: number;
  userEmail: string | null;
}

export default function SearchResultMessage({ items, totalCount, userEmail }: SearchResultMessageProps) {
  const overflow = totalCount - items.length;

  return (
    <div className={styles.resultList}>
      {items.map((item, i) => (
        <div key={i} className={styles.resultRow}>
          <span className={styles.resultTitle}>
            {item.make} {item.model} ({item.year})
          </span>
          <span className={styles.resultPrice}>
            {item.price !== null ? `€${item.price.toLocaleString()}` : 'Not available'}
          </span>
          {item.sourceUrl !== null ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.resultLink}
            >
              View listing
            </a>
          ) : (
            <span className={styles.resultLinkUnavailable}>Not available</span>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <p className={styles.resultOverflow}>
          {overflow} more result{overflow !== 1 ? 's' : ''}
          {userEmail ? ' — check your email for the full list' : ''}
        </p>
      )}
    </div>
  );
}
