import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchThread, updateThread, sendReply as apiSendReply } from '../utils/api';

export function useThread(threadId) {
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (showLoader = true) => {
    if (!threadId) return;
    if (showLoader) setLoading(true);
    try {
      const { data } = await fetchThread(threadId);
      setThread(data.thread);
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    load(true);
  }, [load]);

  // Poll for new messages every 15 seconds (silent — no loading indicator)
  useEffect(() => {
    if (!threadId) return;
    pollRef.current = setInterval(() => load(false), 15000);
    return () => clearInterval(pollRef.current);
  }, [threadId, load]);

  const patchStatus = useCallback(async (status) => {
    if (!thread) return;
    setThread(prev => ({ ...prev, status }));
    try {
      await updateThread(thread.id, { status });
    } catch (err) {
      console.error('Status update failed:', err.message);
    }
  }, [thread]);

  const reply = useCallback(async ({ body, bodyHtml, isNote, brandName, gmailThreadId, attachments }) => {
    setSending(true);
    try {
      if (attachments && attachments.length > 0) {
        // Send as multipart form data
        const formData = new FormData();
        formData.append('body', body);
        if (bodyHtml) formData.append('body_html', bodyHtml);
        formData.append('isNote', !!isNote);
        formData.append('brandName', brandName || '');
        attachments.forEach(file => formData.append('attachments', file));
        await apiSendReply(gmailThreadId, formData);
      } else {
        await apiSendReply(gmailThreadId, { body, body_html: bodyHtml, isNote: !!isNote, brandName });
      }

      // Append to local messages optimistically
      const newMsg = {
        id: Date.now(),
        direction: 'outbound',
        body,
        is_note: isNote ? 1 : 0,
        sent_at: new Date().toISOString(),
        from_email: 'you',
        attachments: (attachments || []).map(f => ({ filename: f.name, mime_type: f.type, size: f.size })),
      };
      setMessages(prev => [...prev, newMsg]);

      // Auto advance status
      if (!isNote && thread?.status === 'open') {
        setThread(prev => ({ ...prev, status: 'in_progress' }));
      }

      return true;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return false;
    } finally {
      setSending(false);
    }
  }, [thread]);

  return { thread, messages, loading, sending, error, reload: load, patchStatus, reply, setThread };
}
