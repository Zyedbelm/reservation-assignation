
import { useState, useCallback } from 'react';

export const useEditingState = (initialState = false) => {
  const [isEditing, setIsEditing] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startEditing = useCallback(() => {
    console.log('🔄 useEditingState: Starting edit mode');
    setIsEditing(true);
  }, []);

  const stopEditing = useCallback(() => {
    console.log('🔄 useEditingState: Stopping edit mode');
    setIsEditing(false);
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    console.log('🔄 useEditingState: Setting submitting state:', submitting);
    setIsSubmitting(submitting);
  }, []);

  const cancelEditing = useCallback(() => {
    console.log('🔄 useEditingState: Cancelling edit mode');
    setIsEditing(false);
    setIsSubmitting(false);
  }, []);

  return {
    isEditing,
    isSubmitting,
    startEditing,
    stopEditing,
    setSubmitting,
    cancelEditing
  };
};
