import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MessageSquare,
  Star,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import styles from './TestComments.module.css';

interface TestComment {
  id: string;
  screen: string;
  category: string;
  rating: number;
  comment: string;
  timestamp: string;
  userName?: string;
}

const SCREENS = [
  { value: '', label: 'Select a Screen' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'initiatives', label: 'Initiatives' },
  { value: 'allInitiatives', label: 'All Initiatives' },
  { value: 'auditLogs', label: 'Audit Logs' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'home', label: 'Home' },
  { value: 'categorySelection', label: 'Category Selection' },
  { value: 'initiativeDetail', label: 'Initiative Detail' },
  { value: 'dateverseViewer', label: 'Dataverse Viewer' },
];

const FEEDBACK_CATEGORIES = [
  { value: 'ui_ux', label: 'UI/UX Design', icon: '🎨' },
  { value: 'performance', label: 'Performance', icon: '⚡' },
  { value: 'functionality', label: 'Functionality', icon: '⚙️' },
  { value: 'navigation', label: 'Navigation', icon: '🗺️' },
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'feature', label: 'Feature Request', icon: '✨' },
  { value: 'other', label: 'Other', icon: '💭' },
];

const RATINGS = [1, 2, 3, 4, 5];

export function TestComments() {
  const [selectedScreen, setSelectedScreen] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<TestComment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { currentUser } = useData();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedScreen || !selectedCategory || rating === 0 || !comment.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const newComment: TestComment = {
        id: `comment-${Date.now()}`,
        screen: SCREENS.find((s) => s.value === selectedScreen)?.label || selectedScreen,
        category: selectedCategory,
        rating,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
        userName: currentUser?.displayName || 'Anonymous',
      };

      setComments([newComment, ...comments]);
      setSelectedScreen('');
      setSelectedCategory('');
      setRating(0);
      setComment('');

      showToast('Thank you! Your feedback has been submitted.', 'success');
    } catch (error) {
      showToast('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = (id: string) => {
    setComments(comments.filter((c) => c.id !== id));
    showToast('Comment deleted', 'success');
  };

  const commentsByScreen = useMemo(() => {
    if (!selectedScreen) return comments;
    return comments.filter((c) => c.screen === SCREENS.find((s) => s.value === selectedScreen)?.label);
  }, [comments, selectedScreen]);

  const getCategoryInfo = (categoryValue: string) => {
    return FEEDBACK_CATEGORIES.find((c) => c.value === categoryValue);
  };

  const getRatingColor = (r: number) => {
    if (r <= 2) return '#d64545';
    if (r === 3) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Test & Feedback"
        subtitle="Share your experience and help us improve. Tell us what works and what could be better."
        breadcrumbs={['Tools', 'Test Comments']}
      />

      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <div>
              <h2 className={styles.formTitle}>Share Your Feedback</h2>
              <p className={styles.formSubtitle}>Help us improve by sharing your thoughts on any screen</p>
            </div>
            <div className={styles.formIcon}>
              <MessageSquare size={32} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Screen Selection */}
            <div className={styles.formGroup}>
              <label htmlFor="screen" className={styles.label}>
                Which Screen?
              </label>
              <select
                id="screen"
                value={selectedScreen}
                onChange={(e) => setSelectedScreen(e.target.value)}
                className={styles.select}
                required
              >
                {SCREENS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Feedback Category */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Feedback Category</label>
              <div className={styles.categoryGrid}>
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.value}
                    type="button"
                    className={`${styles.categoryButton} ${selectedCategory === cat.value ? styles.categoryButtonActive : ''}`}
                    onClick={() => setSelectedCategory(cat.value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className={styles.categoryIcon}>{cat.icon}</span>
                    <span className={styles.categoryLabel}>{cat.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className={styles.formGroup}>
              <label className={styles.label}>How would you rate this screen?</label>
              <div className={styles.ratingContainer}>
                {RATINGS.map((r) => (
                  <motion.button
                    key={r}
                    type="button"
                    className={styles.ratingButton}
                    onClick={() => setRating(r)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Star
                      size={28}
                      className={styles.star}
                      fill={rating >= r ? getRatingColor(r) : 'none'}
                      color={rating >= r ? getRatingColor(r) : 'var(--border-light)'}
                    />
                  </motion.button>
                ))}
                {rating > 0 && (
                  <span className={styles.ratingText}>
                    {rating === 1 && 'Needs Improvement'}
                    {rating === 2 && 'Could Be Better'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <div className={styles.formGroup}>
              <label htmlFor="comment" className={styles.label}>
                Your Feedback
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what you think... Be specific about what works or what needs improvement."
                className={styles.textarea}
                rows={5}
              />
              <span className={styles.charCount}>
                {comment.length} / 500 characters
              </span>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Send size={18} />
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </motion.button>
          </form>
        </div>

        {/* Feedback List */}
        <div className={styles.feedbackSection}>
          <div className={styles.feedbackHeader}>
            <h2 className={styles.feedbackTitle}>
              Recent Feedback
              {commentsByScreen.length > 0 && (
                <span className={styles.feedbackCount}>{commentsByScreen.length}</span>
              )}
            </h2>
            {comments.length > 0 && !selectedScreen && (
              <p className={styles.feedbackSubtitle}>
                Showing all feedback. Select a screen above to filter.
              </p>
            )}
            {selectedScreen && commentsByScreen.length === 0 && (
              <p className={styles.feedbackSubtitle}>No feedback yet for this screen.</p>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {commentsByScreen.length > 0 ? (
              <div className={styles.commentsList}>
                {commentsByScreen.map((item, idx) => {
                  const categoryInfo = getCategoryInfo(item.category);
                  return (
                    <motion.div
                      key={item.id}
                      className={styles.commentCard}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      layout
                    >
                      <div className={styles.commentHeader}>
                        <div className={styles.commentMeta}>
                          <span className={styles.commentScreen}>
                            <MessageSquare size={14} />
                            {item.screen}
                          </span>
                          <Badge type={item.rating >= 4 ? 'success' : item.rating === 3 ? 'warning' : 'danger'}>
                            {item.rating}
                            <Star size={12} fill="currentColor" />
                          </Badge>
                          {categoryInfo && (
                            <span className={styles.commentCategory}>
                              {categoryInfo.icon} {categoryInfo.label}
                            </span>
                          )}
                        </div>
                        <motion.button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => handleDeleteComment(item.id)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Delete comment"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>

                      <p className={styles.commentText}>{item.comment}</p>

                      <div className={styles.commentFooter}>
                        <span className={styles.commentTime}>
                          <Calendar size={12} />
                          {new Date(item.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {item.userName && <span className={styles.userName}>{item.userName}</span>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                className={styles.emptyState}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <MessageSquare size={48} />
                <h3>No Feedback Yet</h3>
                <p>Be the first to share your thoughts about {selectedScreen ? 'this screen' : 'any screen'}!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
