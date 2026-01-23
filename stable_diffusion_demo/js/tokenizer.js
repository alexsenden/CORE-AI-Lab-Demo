/**
 * Simple tokenizer implementation for CLIP tokenizer.
 * This is a simplified version - in production, you'd want to use the actual tokenizer.
 */

class SimpleTokenizer {
    constructor() {
        // Basic vocabulary - this is simplified
        // In production, you'd load the actual CLIP tokenizer vocab
        this.vocab = {};
        this.bpeRanks = {};
        this.cache = {};
    }

    /**
     * Load tokenizer from files (vocab.json and merges.txt)
     * For now, we'll use a simplified approach
     */
    async load() {
        try {
            // Try to load actual tokenizer files
            const vocabResponse = await fetch('models/vocab.json');
            const mergesResponse = await fetch('models/merges.txt');
            
            if (vocabResponse.ok && mergesResponse.ok) {
                this.vocab = await vocabResponse.json();
                const mergesText = await mergesResponse.text();
                this.bpeRanks = this.parseMerges(mergesText);
                return true;
            }
        } catch (e) {
            console.warn('Could not load tokenizer files, using simplified version');
        }
        
        // Fallback: use a basic implementation
        return false;
    }

    parseMerges(mergesText) {
        const ranks = {};
        const lines = mergesText.split('\n');
        for (let i = 1; i < lines.length; i++) { // Skip first line
            const line = lines[i].trim();
            if (line) {
                const parts = line.split(' ');
                if (parts.length === 2) {
                    ranks[parts[0] + ' ' + parts[1]] = i - 1;
                }
            }
        }
        return ranks;
    }

    /**
     * Simple tokenization - split on whitespace and basic punctuation
     * This is a simplified version. For production, use proper BPE tokenization.
     */
    tokenize(text) {
        // Convert to lowercase and add start/end tokens
        text = text.toLowerCase().trim();
        
        // Simple word splitting (this is very simplified)
        // In production, you'd use proper BPE tokenization
        const words = text.split(/\s+/);
        const tokens = ['<|startoftext|>'];
        
        for (const word of words) {
            // Simple character-level tokenization as fallback
            // This won't match CLIP exactly but will work for demo
            const chars = word.split('');
            for (const char of chars) {
                const code = char.charCodeAt(0);
                if (code < 256) {
                    tokens.push(String.fromCharCode(code));
                }
            }
            tokens.push(' ');
        }
        
        tokens.push('<|endoftext|>');
        
        // Pad to 77 tokens
        while (tokens.length < 77) {
            tokens.push('<|endoftext|>');
        }
        
        return tokens.slice(0, 77);
    }

    /**
     * Convert text to token IDs using BPE if available, otherwise simplified encoding
     */
    encode(text) {
        // If we have vocab loaded, try to use proper BPE tokenization
        if (Object.keys(this.vocab).length > 0 && Object.keys(this.bpeRanks).length > 0) {
            return this.bpeEncode(text);
        } else {
            // Fallback to simplified encoding
            return this.simpleEncode(text);
        }
    }

    /**
     * Simplified encoding (fallback)
     */
    simpleEncode(text) {
        const tokens = this.tokenize(text);
        const ids = new Array(77).fill(49407); // Default to padding token ID (49407)
        
        // Try to map tokens to vocab, fallback to hash
        for (let i = 0; i < Math.min(tokens.length, 77); i++) {
            const token = tokens[i];
            if (this.vocab[token] !== undefined) {
                ids[i] = this.vocab[token];
            } else {
                // Hash-based fallback (not ideal but functional)
                let hash = 0;
                for (let j = 0; j < token.length; j++) {
                    hash = ((hash << 5) - hash) + token.charCodeAt(j);
                    hash = hash & hash;
                }
                ids[i] = Math.abs(hash) % 49408; // CLIP vocab size is ~49408
            }
        }
        
        return ids;
    }

    /**
     * BPE encoding (simplified implementation)
     */
    bpeEncode(text) {
        // Add start and end tokens
        text = '<|startoftext|>' + text.toLowerCase() + '<|endoftext|>';
        
        // Convert text to byte-level tokens
        const bytes = new TextEncoder().encode(text);
        const word = Array.from(bytes).map(b => String.fromCharCode(b));
        
        // Apply BPE merges (simplified - full implementation would be more complex)
        let pairs = this.getWordPairs(word);
        if (pairs.length === 0) {
            return this.wordToIds(word);
        }
        
        // Apply merges based on bpeRanks
        while (true) {
            const bigram = this.getMinPair(pairs);
            if (!(bigram in this.bpeRanks)) {
                break;
            }
            
            const first = bigram.split(' ')[0];
            const second = bigram.split(' ')[1];
            const newWord = [];
            let i = 0;
            
            while (i < word.length) {
                try {
                    const j = word.indexOf(first, i);
                    if (j === -1) {
                        newWord.push(...word.slice(i));
                        break;
                    }
                    newWord.push(...word.slice(i, j));
                    i = j;
                    
                    if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
                        newWord.push(first + second);
                        i += 2;
                    } else {
                        newWord.push(word[i]);
                        i += 1;
                    }
                } catch (e) {
                    newWord.push(...word.slice(i));
                    break;
                }
            }
            
            word.splice(0, word.length, ...newWord);
            if (word.length === 1) {
                break;
            } else {
                pairs = this.getWordPairs(word);
            }
        }
        
        return this.wordToIds(word);
    }

    getWordPairs(word) {
        const pairs = new Set();
        let prevChar = word[0];
        for (let i = 1; i < word.length; i++) {
            pairs.add(prevChar + ' ' + word[i]);
            prevChar = word[i];
        }
        return Array.from(pairs);
    }

    getMinPair(pairs) {
        let minRank = Infinity;
        let minPair = null;
        for (const pair of pairs) {
            const rank = this.bpeRanks[pair];
            if (rank !== undefined && rank < minRank) {
                minRank = rank;
                minPair = pair;
            }
        }
        return minPair || pairs[0];
    }

    wordToIds(word) {
        const ids = new Array(77).fill(49407); // Padding token
        for (let i = 0; i < Math.min(word.length, 77); i++) {
            const token = word[i];
            if (this.vocab[token] !== undefined) {
                ids[i] = this.vocab[token];
            } else {
                // Unknown token - use UNK token if available, otherwise 0
                ids[i] = this.vocab['<|endoftext|>'] || 49407;
            }
        }
        return ids;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleTokenizer;
}
