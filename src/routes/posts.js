const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

// Create post
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, categories = [] } = req.body;
    const slug = slugify(title, { lower: true, strict: true });
    const exists = await Post.findOne({ slug });
    const finalSlug = exists ? `${slug}-${Date.now().toString(36)}` : slug;
    const catDocs = await Promise.all(categories.map(async (c) => {
      let cat = await Category.findOne({ name: c });
      if (!cat) cat = await Category.create({ name: c, slug: slugify(c, { lower: true, strict: true }) });
      return cat._id;
    }));
    const post = new Post({ title, slug: finalSlug, content, author: req.user._id, categories: catDocs });
    await post.save();
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit post
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });
    if (post.author.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    const { title, content, categories = [] } = req.body;
    if (title && title !== post.title) {
      post.title = title;
      post.slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
    }
    post.content = content || post.content;
    const catDocs = await Promise.all(categories.map(async (c) => {
      let cat = await Category.findOne({ name: c });
      if (!cat) cat = await Category.create({ name: c, slug: slugify(c, { lower: true, strict: true }) });
      return cat._id;
    }));
    post.categories = catDocs;
    post.updatedAt = Date.now();
    await post.save();
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });
    if (post.author.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    await post.remove();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all posts with search, category, pagination
router.get('/', async (req, res) => {
  try {
    const { q, category, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (q) filter.$or = [ { title: new RegExp(q, 'i') }, { content: new RegExp(q, 'i') } ];
    if (category) {
      const cat = await Category.findOne({ slug: category }) || await Category.findOne({ name: category });
      if (cat) filter.categories = cat._id;
    }
    const skip = (Math.max(1, page) - 1) * limit;
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'username')
      .populate('categories', 'name slug');
    const total = await Post.countDocuments(filter);
    res.json({ posts, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('categories', 'name slug');
    if (!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
