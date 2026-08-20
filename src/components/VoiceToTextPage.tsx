import { useState, useRef } from 'react';
import { useToast } from '../components/Toast';
import { Mic, MicOff, Copy, Trash2, Save, Clock, Check } from 'lucide-react';

interface VoiceNote {
  id: string;
  text: string;
  duration: string;
  createdAt: string;
}

export default function VoiceToTextPage() {
  const toast = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN'; // Supports Hindi + English

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev + ' ' + finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast.error('Recording error');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
    toast.success('Recording started... Speak now!');
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const saveNote = () => {
    if (!transcript.trim()) return;
    const note: VoiceNote = {
      id: Date.now().toString(),
      text: transcript.trim(),
      duration: '0:00',
      createdAt: new Date().toISOString(),
    };
    setNotes(prev => [note, ...prev]);
    setTranscript('');
    toast.success('Note saved!');
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('Note deleted');
  };

  const copyNote = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Mic className="text-red-500" /> Voice-to-Text Notes
        </h1>
        <p className="text-gray-600 mt-1">Speak in Hindi or English - AI transcribes automatically</p>
      </div>

      {/* Recorder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/30'
              : 'bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg shadow-red-500/20'
          }`}
        >
          {isRecording ? <MicOff size={36} className="text-white" /> : <Mic size={36} className="text-white" />}
        </button>
        <p className="text-sm text-gray-500">
          {isRecording ? '🔴 Recording... Click to stop' : 'Click to start recording'}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Transcript</h3>
          <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
            <p className="text-gray-800 whitespace-pre-wrap">{transcript}</p>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveNote}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save size={16} /> Save Note
            </button>
            <button
              onClick={() => setTranscript('')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Saved Notes */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={18} /> Saved Notes
          </h3>
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-gray-800">{note.text}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString()}</span>
                <div className="flex gap-1">
                  <button onClick={() => copyNote(note.text)} className="p-1.5 hover:bg-gray-100 rounded">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}