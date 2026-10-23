# Minna no Nihongo import

Word list source: https://github.com/vitto4/MinnaNoDS (v1.1.2), second-edition
entries of Minna no Nihongo Shokyuu I & II (lessons 1-50). The selection of
words and the English glosses belong to 3A Corporation. The dataset is meant
to be used alongside the books, never commercially. This app is a personal,
self-hosted study tool; the Vietnamese meanings, examples and Han-Viet data
are authored separately.

Pipeline:
1. `node scripts/minna/match.mjs`: matches `minna-ed2.json` against the app's N5 + N4
   vocabulary, writes `matches.json` (existing ids to tag with `minna`) and
   `new-words.json` + `chunks/in-NN.json` (words to author).
2. Authored output lives in `chunks/out-NN.json` (vi, pos, verbGroup, adjType, examples).
3. `node scripts/minna/merge.mjs` appends the new entries and tags matched ones.
