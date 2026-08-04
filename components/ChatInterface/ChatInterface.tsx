import styles from './ChatInterface.module.css';

export default function ChatInterface() {
  return (
    <section className={styles.section}>
      <div className={styles.messages}>
        <p className={styles.placeholder}>Your conversation will appear here</p>
      </div>
      <div className={styles.inputRow}>
        <textarea className={styles.textarea} placeholder="Ask me anything about buying a car…" />
        <button type="button" className={styles.sendButton}>
          Send
        </button>
      </div>
    </section>
  );
}
