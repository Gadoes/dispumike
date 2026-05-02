{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0  Codebase Report: dispumike                                                              \
                                                                                          \
  1. Stack Overview                                                                       \
                                                                                          \
  Monorepo structure: /frontend (Next.js app) and /backend (Express API) are completely   \
  separate packages with their own package.json.                                          \
                                                                                          \
  \uc0\u9484 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9488   \
  \uc0\u9474        Layer       \u9474          Technology         \u9474              Version             \u9474  \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508  \
  \uc0\u9474  Frontend          \u9474  Next.js (with React        \u9474  16.0.3                          \u9474  \
  \uc0\u9474  framework         \u9474  Compiler enabled)          \u9474                                  \u9474  \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  Frontend runtime  \u9474  React                      \u9474  19.2.0                          \u9474     \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  Styling           \u9474  Tailwind CSS               \u9474  4.x                             \u9474     \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508   \
  \uc0\u9474  Backend framework \u9474  Express                    \u9474  4.21.2                          \u9474  \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508  \
  \uc0\u9474  Language          \u9474  TypeScript (both ends)     \u9474  strict mode                     \u9474     \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508  \
  \uc0\u9474  Database          \u9474  Postgres via Supabase      \u9474  \'97                               \u9474     \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508   \
  \uc0\u9474  Auth              \u9474  Supabase JWT               \u9474  @supabase/supabase-js 2.49.4 /  \u9474     \
  \uc0\u9474                    \u9474                             \u9474  2.81.1                          \u9474   \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  File storage      \u9474  Cloudflare R2              \u9474  @aws-sdk/client-s3              \u9474   \
  \uc0\u9474                    \u9474  (S3-compatible)            \u9474                                  \u9474  \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508  \
  \uc0\u9474  LLM providers     \u9474  Anthropic Claude + Google  \u9474  @anthropic-ai/sdk 0.90.0,       \u9474     \
  \uc0\u9474                    \u9474  Gemini                     \u9474  @google/genai 1.50.1            \u9474  \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  PDF parsing       \u9474  pdfjs-dist                 \u9474  4.10.38                         \u9474   \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  DOCX generation   \u9474  docx                       \u9474  9.6.1                           \u9474   \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  DOCX extraction   \u9474  mammoth                    \u9474  1.9.0                           \u9474  \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  DOC\u8594 PDF           \u9474  libreoffice-convert        \u9474  1.6.0                           \u9474   \
  \uc0\u9474  conversion        \u9474                             \u9474                                  \u9474     \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  File upload       \u9474  multer                     \u9474  1.4.5                           \u9474  \
  \uc0\u9474  middleware        \u9474                             \u9474                                  \u9474     \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  Excel export      \u9474  exceljs                    \u9474  4.4.0                           \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  Rich text editor  \u9474  @tiptap/react              \u9474  \'97                               \u9474   \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508     \
  \uc0\u9474  Deployment target \u9474  Cloudflare Pages via       \u9474  wrangler 4.51.0                 \u9474 \
  \uc0\u9474   (frontend)       \u9474  OpenNextJS                 \u9474                                  \u9474     \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508   \
  \uc0\u9474  License           \u9474  AGPL-3.0-only              \u9474  \'97                               \u9474 \
  \uc0\u9492 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9496     \
  \
  Note: Next.js 16 with React 19 and the React Compiler (reactCompiler: true in           \
  frontend/next.config.ts) is a very recent combination. The OpenNextJS adapter for     \
  Cloudflare Pages deployment means Next.js server-side features run as Cloudflare        \
  Workers, not Node.js.                                                                 \
\
  ---\
  2. Repository Map\
                                                                                          \
  dispumike/\
  \uc0\u9500 \u9472 \u9472  backend/                   \u8592  Express API server (Node.js/TypeScript)                \
  \uc0\u9474    \u9500 \u9472 \u9472  migrations/            \u8592  One-shot Postgres schema + pgcrypto extension          \
  \uc0\u9474    \u9474    \u9492 \u9472 \u9472  000_one_shot_schema.sql                                                     \
  \uc0\u9474    \u9492 \u9472 \u9472  src/                                                                            \
  \uc0\u9474        \u9500 \u9472 \u9472  index.ts           \u8592  Express app entry point; mounts all routers            \
  \uc0\u9474        \u9500 \u9472 \u9472  middleware/                                                               \
  \uc0\u9474        \u9474    \u9492 \u9472 \u9472  auth.ts        \u8592  requireAuth: Bearer token \u8594  Supabase validate \u8594         \
  res.locals                                                                              \
  \uc0\u9474        \u9500 \u9472 \u9472  lib/               \u8592  All domain logic (no framework code)                   \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  access.ts      \u8592  Project/doc/review access control (owner vs shared)    \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  builtinWorkflows.ts  \u8592  Hard-coded system workflow templates             \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  chatTools.ts   \u8592  SYSTEM_PROMPT, all tool definitions, runLLMStream, tool\
   dispatch                                                                               \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  convert.ts     \u8592  LibreOffice DOCX\u8594 PDF conversion helpers                \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  documentVersions.ts  \u8592  Version row helpers (loadActiveVersion,          \
  attachActiveVersionPaths)                                                               \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  docxTrackedChanges.ts \u8592  Word tracked-change diffing (applyTrackedEdits, \
  extractDocxBodyText)                                                                    \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  downloadTokens.ts    \u8592  Persistent download URL builder                \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  llm/           \u8592  LLM provider abstraction layer                         \
  \uc0\u9474        \u9474    \u9474    \u9500 \u9472 \u9472  index.ts   \u8592  streamChatWithTools, completeText (routes by provider)\
  \uc0\u9474        \u9474    \u9474    \u9500 \u9472 \u9472  claude.ts  \u8592  Anthropic SDK adapter (streaming + thinking)           \
  \uc0\u9474        \u9474    \u9474    \u9500 \u9472 \u9472  gemini.ts  \u8592  Google GenAI adapter (streaming + thinking)            \
  \uc0\u9474        \u9474    \u9474    \u9500 \u9472 \u9472  models.ts  \u8592  Canonical model IDs, providerForModel(), tier constants\
  \uc0\u9474        \u9474    \u9474    \u9500 \u9472 \u9472  tools.ts   \u8592  OpenAI schema \u8594  Claude/Gemini schema normalization     \
  \uc0\u9474        \u9474    \u9474    \u9492 \u9472 \u9472  types.ts   \u8592  Shared LLM types (StreamChatParams, NormalizedToolCall,\
   etc.)                                                                                  \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  storage.ts     \u8592  Cloudflare R2 upload/download/presigned-URL helpers    \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  supabase.ts    \u8592  createServerSupabase() factory                         \
  \uc0\u9474        \u9474    \u9500 \u9472 \u9472  upload.ts      \u8592  Multer memory upload middleware (100 MB, pdf/docx/doc) \
  \uc0\u9474        \u9474    \u9492 \u9472 \u9472  userSettings.ts \u8592  getUserApiKeys, getUserModelSettings (per-user key    \
  fallback)                                                                               \
  \uc0\u9474        \u9492 \u9472 \u9472  routes/            \u8592  Express routers, one file per domain                   \
  \uc0\u9474            \u9500 \u9472 \u9472  chat.ts        \u8592  /chat \'97 streaming chat, history, title generation      \
  \uc0\u9474            \u9500 \u9472 \u9472  documents.ts   \u8592  /single-documents + /projects/:id/documents \'97 upload,  \
  versioning, display                                                                     \
  \uc0\u9474            \u9500 \u9472 \u9472  downloads.ts   \u8592  /download \'97 token-based file download                  \
  \uc0\u9474            \u9500 \u9472 \u9472  projectChat.ts \u8592  /projects/:id/chat \'97 project-scoped streaming chat     \
  \uc0\u9474            \u9500 \u9472 \u9472  projects.ts    \u8592  /projects \'97 CRUD, sharing, folder management         \
  \uc0\u9474            \u9500 \u9472 \u9472  tabular.ts     \u8592  /tabular-review \'97 spreadsheet extraction, tabular chat \
  \uc0\u9474            \u9500 \u9472 \u9472  user.ts        \u8592  /user \'97 profile, API keys, model preferences           \
  \uc0\u9474            \u9492 \u9472 \u9472  workflows.ts   \u8592  /workflows \'97 CRUD, sharing, hidden list                \
  \uc0\u9474                                                                                        \
  \uc0\u9492 \u9472 \u9472  frontend/                  \u8592  Next.js app (React 19, App Router)                   \
      \uc0\u9492 \u9472 \u9472  src/                                                                            \
          \uc0\u9500 \u9472 \u9472  app/                                                                      \
          \uc0\u9474    \u9500 \u9472 \u9472  (pages)/       \u8592  Route segments (App Router)                            \
          \uc0\u9474    \u9474    \u9500 \u9472 \u9472  assistant/ \u8592  /assistant, /assistant/chat/[id] \'97 free-form chat      \
          \uc0\u9474    \u9474    \u9500 \u9472 \u9472  projects/  \u8592  /projects, /projects/[id],                             \
  /projects/[id]/assistant/chat/[chatId]                                                  \
          \uc0\u9474    \u9474    \u9500 \u9472 \u9472  tabular-reviews/ \u8592  /tabular-reviews, /tabular-reviews/[id]          \
          \uc0\u9474    \u9474    \u9492 \u9472 \u9472  workflows/ \u8592  /workflows, /workflows/[id]                            \
          \uc0\u9474    \u9500 \u9472 \u9472  components/    \u8592  Feature-scoped React components                      \
          \uc0\u9474    \u9474    \u9500 \u9472 \u9472  assistant/ \u8592  ChatView, ChatInput, AssistantMessage, ModelToggle,    \
  EditCard, etc.                                                                          \
          \uc0\u9474    \u9474    \u9500 \u9472 \u9472  projects/  \u8592  ProjectPage, ProjectExplorer, ProjectsOverview         \
          \uc0\u9474    \u9474    \u9500 \u9472 \u9472  tabular/   \u8592  TabularReviewView, TRTable, TabularCell, TRChatPanel   \
          \uc0\u9474    \u9474    \u9500 \u9472 \u9472  workflows/ \u8592  WorkflowList, NewWorkflowModal, WorkflowPromptEditor   \
          \uc0\u9474    \u9474    \u9492 \u9472 \u9472  shared/    \u8592  DocView, DocPanel, FileDirectory, citation-utils,      \
  types.ts                                                                                \
          \uc0\u9474    \u9500 \u9472 \u9472  contexts/      \u8592  React Context providers (ChatHistoryContext,           \
  SidebarContext)                                                                         \
          \uc0\u9474    \u9500 \u9472 \u9472  hooks/         \u8592  useAssistantChat (core), useGenerateChatTitle,       \
  useDocumentVersions, etc.                                                               \
          \uc0\u9474    \u9492 \u9472 \u9472  lib/                                                                  \
          \uc0\u9474        \u9500 \u9472 \u9472  mikeApi.ts \u8592  All fetch calls to the Express backend (streamChat,    \
  streamProjectChat, etc.)                                                                \
          \uc0\u9474        \u9492 \u9472 \u9472  modelAvailability.ts \u8592  Which models are available given the user's\
  API keys                                                                                \
          \uc0\u9500 \u9472 \u9472  components/                                                               \
          \uc0\u9474    \u9500 \u9472 \u9472  providers.tsx  \u8592  Root context provider tree                             \
          \uc0\u9474    \u9492 \u9472 \u9472  ui/            \u8592  Radix UI-based primitives (button, badge,\
  dropdown-menu, cite-button)                                                             \
          \uc0\u9500 \u9472 \u9472  contexts/          \u8592  AuthContext, UserProfileContext (top-level, outside App\
   Router)                                                                                \
          \uc0\u9492 \u9472 \u9472  lib/                                                                      \
              \uc0\u9500 \u9472 \u9472  auth.ts        \u8592  getUserFromRequest (server-side Supabase JWT           \
  validation)                                                                             \
              \uc0\u9500 \u9472 \u9472  supabase.ts    \u8592  Supabase browser client\
              \uc0\u9492 \u9472 \u9472  types.ts       \u8592  Shared frontend types                                  \
                                                                                        \
  Entry points: backend/src/index.ts (Express), frontend/src/app/layout.tsx (Next.js root \
  layout).                                                                              \
  Domain logic lives entirely in: backend/src/lib/chatTools.ts (tool dispatch + system    \
  prompt) and backend/src/lib/llm/ (provider adapters).                                   \
  \
  ---                                                                                     \
  3. Data Layer                                                                         \
                                                                                          \
  Database: Postgres hosted on Supabase. Schema defined in\
  backend/migrations/000_one_shot_schema.sql.                                             \
                                                                                        \
  Auth provider: Supabase Auth. On signup, a trigger (on_auth_user_created) calls         \
  handle_new_user() which inserts a row into user_profiles. The backend validates Bearer\
  tokens using the Supabase service key (SUPABASE_SECRET_KEY) via the server-side client  \
  in backend/src/lib/supabase.ts.                                                       \
\
  Core tables and relationships\
\
  auth.users (Supabase-managed)\
      \uc0\u9492 \u9472 \u9472  user_profiles          (1:1, cascades on delete)                                \
              \uc0\u9500 \u9472 \u9472  tier, message_credits_used, credits_reset_date                          \
              \uc0\u9500 \u9472 \u9472  claude_api_key, gemini_api_key   \u8592  per-user LLM keys                    \
              \uc0\u9492 \u9472 \u9472  tabular_model                                                           \
                                                                                          \
  projects (user_id: text, shared_with: jsonb array of emails)                            \
      \uc0\u9500 \u9472 \u9472  project_subfolders     (self-referential parent_folder_id)                    \
      \uc0\u9500 \u9472 \u9472  documents              (project_id nullable \u8594  standalone doc)                   \
      \uc0\u9474        \u9500 \u9472 \u9472  document_versions  (storage_path, pdf_storage_path, source,           \
  version_number)                                                                         \
      \uc0\u9474        \u9474        \u9492 \u9472 \u9472  document_edits (tracked changes: del_w_id, ins_w_id, status:  \
  pending|accepted|rejected)                                                              \
      \uc0\u9474        \u9492 \u9472 \u9472  documents.current_version_id \u8594  document_versions.id                   \
      \uc0\u9500 \u9472 \u9472  chats                  (project_id nullable \u8594  free-form chat)                   \
      \uc0\u9474        \u9492 \u9472 \u9472  chat_messages  (role, content: AssistantEvent[] jsonb, annotations:     \
  citation jsonb, files jsonb)                                                            \
      \uc0\u9492 \u9472 \u9472  tabular_reviews        (columns_config jsonb, shared_with jsonb, workflow_id    \
  nullable FK)                                                                            \
              \uc0\u9500 \u9472 \u9472  tabular_cells  (document_id FK, column_index, content, citations jsonb,\
  status)                                                                                 \
              \uc0\u9492 \u9472 \u9472  tabular_review_chats \u8594  tabular_review_chat_messages                   \
                                                                                          \
  workflows (user_id nullable for system, type: assistant|tabular, is_system boolean)     \
      \uc0\u9500 \u9472 \u9472  workflow_shares        (shared_with_email, allow_edit)\
      \uc0\u9492 \u9472 \u9472  hidden_workflows       (per-user hidden list)                                   \
                                                                                          \
  Row-level security                                                                      \
                                                                                          \
  RLS is only enabled on user_profiles at the DB level:                                   \
  create policy "Users can view their own profile" on public.user_profiles\
    for select using (auth.uid() = user_id);                                              \
  create policy "Users can update their own profile" on public.user_profiles            \
    for update using (auth.uid() = user_id);                                              \
                                            \
  All other tables have no Postgres RLS. Access control for projects, documents, chats,   \
  and reviews is enforced exclusively in Express route handlers using the helper functions\
   in backend/src/lib/access.ts. The three helpers \'97 checkProjectAccess, ensureDocAccess,\
  ensureReviewAccess \'97 implement "owner OR email in shared_with array" logic.             \
  listAccessibleProjectIds (also in access.ts) is used for list queries.                \
\
  ---\
  4. Document Ingestion Path\
                            \
  Upload \uc0\u8594  Storage \u8594  Conversion \u8594  DB\
                                                                                          \
  1. HTTP upload (POST /projects/:projectId/documents or POST /single-documents): Multer  \
  middleware in backend/src/lib/upload.ts accepts multipart/form-data with field name     \
  "file", stores in memory, max 100 MB, accepts only pdf, docx, doc.                      \
  2. Storage: Raw bytes are written to Cloudflare R2 via uploadFile() in                \
  backend/src/lib/storage.ts. Storage key pattern:                                        \
  documents/$\{userId\}/$\{documentId\}/$\{filename\}.\
  3. DOCX\uc0\u8594 PDF conversion (backend/src/lib/convert.ts): If the upload is .docx or .doc,    \
  libreoffice-convert converts it to PDF and the PDF is stored separately. The PDF path is\
   recorded as document_versions.pdf_storage_path.\
  4. DB records: A documents row is inserted, followed by a document_versions row with    \
  source: 'upload' and version_number: 1. documents.current_version_id is set to the new  \
  version.\
  5. No chunking. No embeddings. No vector store. Documents are read in their entirety at \
  LLM inference time. When the model calls read_document,                                 \
  backend/src/lib/chatTools.ts:readDocumentContent() (line 1134) downloads the raw bytes\
  from R2, extracts text via extractPdfText() (pdfjs-dist, returning [Page N]\\n<text> per \
  page) for PDFs or extractDocxBodyText() / mammoth for DOCX, and returns the full      \
  plaintext to the LLM as a tool result.\
  6. Document metadata: documents.structure_tree (JSONB) stores a parsed table-of-contents\
   when available. documents.page_count is stored. No semantic metadata; no embeddings.   \
  \
  Text extraction format for PDFs (chatTools.ts:634):                                     \
  parts.push(`[Page $\{i\}]\\n$\{textContent.items.map((it) => it.str ?? "").join(" ")\}`);  \
  These [Page N] markers are what the citation system's page field refers to.             \
                                                                                          \
  ---                                                                                     \
  5. Chat and Agent Loop                                                                  \
                                                                                          \
  What happens when a user submits a message                                            \
\
  Entry point: POST /chat (backend/src/routes/chat.ts:317) or POST\
  /projects/:projectId/chat (backend/src/routes/projectChat.ts).\
\
  1. Auth + chat resolution: requireAuth validates the Bearer token. The route resolves or\
   creates a chats row, checking project access if project_id is present.\
  2. User message persisted: The last user message is written to chat_messages before LLM \
  invocation.                                                                             \
  3. Document context assembly (buildDocContext in chatTools.ts): All documents attached\
  to the current message (and, for project chats, all documents in the project) are       \
  indexed into a DocStore (Map of slug "doc-0", "doc-1", \'85 \uc0\u8594  \{storage_path, file_type,  \
  filename\}) and a DocIndex (slug \uc0\u8594  \{document_id, filename, version_id\}). Slugs are       \
  ephemeral, reassigned every turn.                                                     \
  4. History enrichment (enrichWithPriorEvents, chatTools.ts:488): Loads the last\
  assistant message from DB, scans its stored AssistantEvent[] content, and appends a     \
  [Tool activity in your previous turn] text block to the last assistant message in the\
  conversation. This keeps the model aware of which documents it created or edited in the \
  prior turn, since slugs change each turn.                                             \
  5. Message formatting (buildMessages, chatTools.ts:579): Assembles [\{role: "system", \
  content: SYSTEM_PROMPT + doc list\}, ...history]. The system prompt contains the         \
  available document list:\
  AVAILABLE DOCUMENTS:                                                                    \
  - doc-0: nda_v1.docx                                                                  \
  ...                                                                                     \
  You MUST call read_document at the start of every response...\
  5. Workflow prefixes ([Workflow: <title> (id: <id>)]) and file attachment notices are   \
  prepended to user message content.                                                      \
  6. Streaming headers set:                                                               \
  Content-Type: text/event-stream                                                         \
  Cache-Control: no-cache                                                                 \
  Connection: keep-alive\
  X-Accel-Buffering: no                                                                   \
  7. LLM invocation (runLLMStream in chatTools.ts, called at chat.ts:442): Delegates to \
  streamChatWithTools in backend/src/lib/llm/index.ts, which routes to streamClaude or    \
  streamGemini based on the model prefix. Both implement an agentic loop:\
    - Stream deltas \uc0\u8594  fire onContentDelta / onReasoningDelta callbacks \u8594  write SSE events \
    - When tool calls arrive \uc0\u8594  call runToolCalls() \u8594  inject tool results \u8594  continue       \
  streaming                                                                               \
    - Loop up to maxIterations (default not capped in the visible code; provider adapters \
  handle the multi-turn loop internally)                                                  \
  8. Tool dispatch (runToolCalls, chatTools.ts:1487): Executes whichever tools the model\
  requested, writes SSE progress events (doc_read, doc_find, doc_created, doc_edited,     \
  workflow_applied), and returns tool results to be fed back to the LLM.                \
  9. SSE event types written to the stream:                                               \
    - chat_id \'97 the resolved chat UUID (first event)                                      \
    - content_delta \'97 text chunk                                                          \
    - reasoning_delta \'97 thinking/reasoning text (when enableThinking: true)               \
    - reasoning_block_end                                                                 \
    - tool_call_start \'97 tool name + arguments                                           \
    - doc_read_start, doc_read \'97 document read lifecycle                                  \
    - doc_find \'97 find_in_document result                                                \
    - doc_created \'97 generate_docx result                                                  \
    - doc_edited \'97 edit_document result                                                 \
    - doc_replicated \'97 replicate_document result                                          \
    - workflow_applied \'97 workflow was loaded                                            \
    - citations \'97 final parsed citation array                                             \
    - error \'97 stream error                                                              \
    - [DONE] \'97 stream termination                                                         \
  10. Citations parsed (extractAnnotations, chatTools.ts): After the stream ends, the   \
  <CITATIONS> JSON block is extracted from the full text, resolved to \{document_id,       \
  version_id, page, quote\} entries, and stored in chat_messages.annotations.            \
  11. Assistant message persisted: chat_messages row written with role: "assistant",      \
  content: AssistantEvent[], annotations: MikeCitationAnnotation[].                       \
  \
  LLM provider and models                                                                 \
                                                                                        \
  Provider selection: providerForModel(model) in backend/src/lib/llm/models.ts:39 \'97 models\
   starting with "claude" route to Anthropic, "gemini" to Google.                       \
                                                                                          \
  Main chat models (user picks per message):                                              \
  - Claude: claude-opus-4-7, claude-sonnet-4-6\
  - Gemini: gemini-3.1-pro-preview, gemini-3-flash-preview                                \
  - Default: gemini-3-flash-preview                                                     \
                                                                                          \
  System prompt location: SYSTEM_PROMPT constant at backend/src/lib/chatTools.ts:78. It is\
   135 lines covering citation format, DOCX generation rules, document editing, workflow  \
  trigger behavior, and naming conventions. The document list is appended dynamically in  \
  buildMessages.                                                                          \
                                                                                        \
  Context strategy: Pure full-document loading on demand via tool calls. No RAG, no vector\
   search, no semantic chunking. The model is instructed (in the system prompt, line ~599)\
   to call read_document on every turn it needs document content.                         \
                                                                                        \
  Thinking/reasoning: Enabled with enableThinking: true (off by default per               \
  StreamChatParams docs). Claude uses thinking: \{ type: "adaptive" \} +\
  output_config.effort: "high" with 16384 max tokens. Gemini uses                         \
  thinkingConfig.includeThoughts: true + echoes thoughtSignature for Gemini 3.          \
\
  User-provided API keys: getUserApiKeys in backend/src/lib/userSettings.ts reads         \
  user_profiles.claude_api_key and user_profiles.gemini_api_key. If present, they override\
   the server's env vars.                                                                 \
                                                                                        \
  Frontend streaming                                                                      \
  \
  useAssistantChat hook (frontend/src/app/hooks/useAssistantChat.ts) calls streamChat or  \
  streamProjectChat from frontend/src/app/lib/mikeApi.ts. It reads the response body with\
  response.body.getReader(), parses SSE lines, and accumulates AssistantEvent[]. A        \
  drip-animation timer (DRIP_CHARS_PER_TICK = 8 chars/tick, line 53) gives a typewriter \
  effect by buffering text and releasing it incrementally.\
\
  ---\
  6. Workflow System\
                    \
  What is a Workflow\
                                                                                          \
  A workflow row (backend/migrations/000_one_shot_schema.sql:184) has:                    \
  - type: "assistant" (freeform chat prompt template) or "tabular" (spreadsheet extraction\
   template)                                                                              \
  - prompt_md: Markdown prompt instructions                                             \
  - columns_config (JSONB): Column definitions for tabular workflows                      \
  - practice: Legal practice area tag                                                   \
  - is_system: boolean: System-supplied (seeded from backend/src/lib/builtinWorkflows.ts) \
  vs. user-created                                                                       \
  - Sharing: workflow_shares table (email + allow_edit flag) + per-user hidden_workflows  \
                                                                                        \
  How an assistant workflow is defined                                                    \
                                                                                        \
  Users create workflows via POST /workflows (backend/src/routes/workflows.ts). The       \
  prompt_md field is a free-form markdown prompt. System workflows are seeded at startup\
  from builtinWorkflows.ts.                                                               \
                                                                                        \
  How an assistant workflow is executed                                                   \
  \
  1. In the UI, the user selects a workflow before sending a message. The frontend        \
  attaches \{ workflow: \{ id, title \} \} to the message object.                           \
  2. In buildMessages (chatTools.ts:614-617), if msg.workflow is set, the content is      \
  prepended with:                                                                         \
  [Workflow: <title> (id: <id>)]\
  3. The system prompt (chatTools.ts:124) instructs the model:                            \
  \uc0\u9614  When a user message begins with a [Workflow: <title> (id: <id>)] marker \'85 immediately \
  call the read_workflow tool with that exact id to load the workflow's full prompt, then \
  follow those instructions.                                                              \
  4. The model calls the read_workflow tool. runToolCalls (chatTools.ts:1614) looks up the\
   workflow in workflowStore (a Map built from the DB), emits a workflow_applied SSE      \
  event, and returns prompt_md as the tool result.\
  5. The model uses the returned prompt as its operating instructions for that turn.      \
                                                                                          \
  How a tabular workflow differs\
                                                                                          \
  A tabular workflow has columns_config JSONB defining extraction columns (name, format   \
  type, tags). It is executed via POST /tabular-review/:reviewId/generate\
  (backend/src/routes/tabular.ts), which runs the LLM without the standard streaming chat \
  loop. Instead, for each document \'d7 column cell, it calls completeText (non-streaming) \
  with a per-cell prompt constructed from columns_config plus format constraints (see\
  formatPromptSuffix at tabular.ts:21). Results are stored in tabular_cells. The tabular\
  chat (inside a review) does use streaming with TABULAR_TOOLS and the read_table_cells\
  tool exposed to the model.\
\
  ---\
  7. UI Architecture\
                    \
  Component framework\
                                                                                          \
  Radix UI primitives wrapped as local components in frontend/src/components/ui/ (button, \
  badge, dropdown-menu, input, cite-button). Not shadcn/ui as a package \'97 these are       \
  hand-maintained. Tailwind CSS 4 for styling.                                            \
                                                                                        \
  State management\
\
  React 19 Context API only. No Redux, Zustand, or Jotai.                                 \
  \
  \uc0\u9484 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9488    \
  \uc0\u9474       Context      \u9474                    Location                    \u9474  Responsibilit \u9474  \
  \uc0\u9474                    \u9474                                                \u9474        y       \u9474    \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508  \
  \uc0\u9474                    \u9474                                                \u9474  Supabase      \u9474  \
  \uc0\u9474  AuthContext       \u9474  frontend/src/contexts/AuthContext.tsx         \u9474  session, user \u9474    \
  \uc0\u9474                    \u9474                                                \u9474   object       \u9474  \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508    \
  \uc0\u9474                    \u9474                                                \u9474  user_profiles \u9474  \
  \uc0\u9474  UserProfileContex \u9474  frontend/src/contexts/UserProfileContext.tsx  \u9474   row (tier,   \u9474    \
  \uc0\u9474  t                 \u9474                                                \u9474  keys,         \u9474  \
  \uc0\u9474                    \u9474                                                \u9474  credits)      \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508    \
  \uc0\u9474                    \u9474                                                \u9474  Chat list,    \u9474 \
  \uc0\u9474  ChatHistoryContex \u9474  frontend/src/app/contexts/ChatHistoryContext. \u9474  current chat  \u9474    \
  \uc0\u9474  t                 \u9474  tsx                                           \u9474  ID, message   \u9474  \
  \uc0\u9474                    \u9474                                                \u9474  persistence   \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474                    \u9474                                                \u9474  Sidebar       \u9474 \
  \uc0\u9474  SidebarContext    \u9474  frontend/src/app/contexts/SidebarContext.tsx  \u9474  open/close    \u9474    \
  \uc0\u9474                    \u9474                                                \u9474  state         \u9474 \
  \uc0\u9492 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9496    \
                                                                                        \
  All four are composed in frontend/src/components/providers.tsx.                         \
  \
  Project view layout                                                                     \
                                                                                        \
  ProjectPage (frontend/src/app/components/projects/ProjectPage.tsx) renders a three-panel\
   layout:\
                                                                                          \
  1. Left: ProjectExplorer (components/projects/ProjectExplorer.tsx) \'97 folder tree,       \
  document list, subfolder management.\
  2. Center: DocPanel (components/shared/DocPanel.tsx) \'97 document viewer showing DocView  \
  (PDF via pdfjs-dist) or DocxView (DOCX via mammoth + tiptap).                           \
  3. Right: Chat area \'97 contains ChatView + ChatInput components from\
  components/assistant/.                                                                  \
                                                                                        \
  Chat input                                                                              \
                                                                                        \
  ChatInput lives at frontend/src/app/components/assistant/ChatInput.tsx. It includes:    \
  - Text textarea                                                                       \
  - AddDocButton for attaching documents to the message                                   \
  - ModelToggle (LLM selector)                         \
  - Workflow selector trigger (AssistantWorkflowModal)                                    \
                                                                                        \
  Core chat logic                                                                         \
                                                                                          \
  useAssistantChat hook (frontend/src/app/hooks/useAssistantChat.ts) owns all streaming   \
  state, drip animation, message accumulation, citation loading state, and abort handling.\
   ChatView renders messages and delegates to AssistantMessage for rendering              \
  AssistantEvent[] arrays (content blocks, tool activity cards, edit cards, citation    \
  buttons).\
\
  Citation rendering\
\
  cite-button (frontend/src/components/ui/cite-button.tsx) renders [N] superscript        \
  buttons. Clicking a citation calls into highlightQuote.ts or highlightDocxQuote.ts (in\
  components/shared/) to scroll the document viewer to the cited passage.                 \
  citation-utils.ts (components/tabular/) handles tabular-specific citation formats.    \
\
  ---\
  8. Existing Tool / Function-Call Surface\
                                                                                          \
  All tools are defined in backend/src/lib/chatTools.ts as OpenAI-schema objects. The\
  provider adapters in backend/src/lib/llm/tools.ts translate these to Claude's           \
  input_schema format or Gemini's functionDeclarations format.                          \
                                                                                          \
  TOOLS (available in all chat contexts)                                                  \
  \
  \uc0\u9484 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9488   \
  \uc0\u9474     Tool name     \u9474                           What it does                           \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474                   \u9474  Downloads doc from R2, extracts full text (PDF\u8594 pdfjs,           \u9474 \
  \uc0\u9474  read_document    \u9474  DOCX\u8594 extractDocxBodyText/mammoth), returns raw text with [Page  \u9474 \
  \uc0\u9474                   \u9474  N] markers                                                      \u9474   \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474  find_in_document \u9474  Case-insensitive, whitespace-tolerant substring search; returns \u9474   \
  \uc0\u9474                   \u9474   matches with configurable context window                       \u9474   \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474                   \u9474  Creates a .docx from a structured \{title, sections[],           \u9474   \
  \uc0\u9474  generate_docx    \u9474  landscape?\} schema using the docx library; uploads to R2;       \u9474   \
  \uc0\u9474                   \u9474  inserts documents + document_versions rows; returns             \u9474 \
  \uc0\u9474                   \u9474  download_url and document_id                                    \u9474   \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474                   \u9474  Proposes tracked changes on an existing .docx using             \u9474 \
  \uc0\u9474  edit_document    \u9474  applyTrackedEdits (OOXML revision markup); supports turn-scoped \u9474   \
  \uc0\u9474                   \u9474   version reuse; returns per-edit annotations the UI renders as  \u9474 \
  \uc0\u9474                   \u9474  Accept/Reject cards                                             \u9474   \
  \uc0\u9492 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9496 \
\
  PROJECT_EXTRA_TOOLS (added in project chat contexts)\
\
  \uc0\u9484 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9488   \
  \uc0\u9474      Tool name      \u9474                          What it does                          \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508   \
  \uc0\u9474  list_documents     \u9474  Returns all doc slugs, filenames, and file types from the     \u9474 \
  \uc0\u9474                     \u9474  current docStore                                              \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508   \
  \uc0\u9474  fetch_documents    \u9474  Batch-reads multiple documents in one call (calls             \u9474 \
  \uc0\u9474                     \u9474  readDocumentContent for each)                                 \u9474   \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474  replicate_document \u9474  Creates byte-for-byte copies of an existing project document  \u9474   \
  \uc0\u9474                     \u9474  as new documents rows; supports count up to 20                \u9474   \
  \uc0\u9492 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9496 \
                                                                                          \
  WORKFLOW_TOOLS (added in all chat contexts)                                           \
\
  \uc0\u9484 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9488 \
  \uc0\u9474    Tool name    \u9474                            What it does                            \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474  list_workflows \u9474  Returns all workflow IDs and titles from the current              \u9474 \
  \uc0\u9474                 \u9474  workflowStore                                                     \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508   \
  \uc0\u9474  read_workflow  \u9474  Loads a workflow's prompt_md by ID; emits workflow_applied SSE    \u9474 \
  \uc0\u9474                 \u9474  event                                                             \u9474   \
  \uc0\u9492 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9496 \
                                                                                          \
  TABULAR_TOOLS (added only in tabular review chat)                                     \
\
  \uc0\u9484 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9488 \
  \uc0\u9474     Tool name     \u9474                           What it does                           \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474                   \u9474  Returns extracted cell values from TabularCellStore filtered by \u9474 \
  \uc0\u9474  read_table_cells \u9474   col_indices and row_indices; emits a doc_read_start event with \u9474 \
  \uc0\u9474                   \u9474   column \'d7 row count                                             \u9474   \
  \uc0\u9492 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9496 \
                                                                                          \
  Tool set for each context:                                                              \
  - Free-form chat: TOOLS + WORKFLOW_TOOLS\
  - Project chat: TOOLS + PROJECT_EXTRA_TOOLS + WORKFLOW_TOOLS                            \
  - Tabular review chat: TABULAR_TOOLS only                                             \
                                                                                          \
  ---                                                                                     \
  9. MCP Readiness\
                                                                                          \
  MCP client code: None. No imports of @modelcontextprotocol/sdk appear anywhere in     \
  backend/src/ or frontend/src/.                                                          \
  \
  MCP server code: None.                                                                  \
                                                                                        \
  Package presence: @modelcontextprotocol/sdk ^1.25.2 appears in backend/package-lock.json\
   as an optional/transitive dependency \'97 not in backend/package.json dependencies. It is\
  not installed or used.                                                                  \
                                                                                        \
  Where an MCP host integration would slot in:                                            \
  \
  The natural insertion point is runLLMStream in backend/src/lib/chatTools.ts. That       \
  function currently receives a workflowStore and tabularStore and constructs the tool  \
  list by concatenating constants (TOOLS, PROJECT_EXTRA_TOOLS, WORKFLOW_TOOLS). An MCP    \
  host could:                                                                           \
\
  1. Add a mcpTools?: OpenAIToolSchema[] parameter to StreamChatParams                    \
  (backend/src/lib/llm/types.ts:44) and concatenate them into the tools array before\
  calling streamChatWithTools.                                                            \
  2. Extend runToolCalls (chatTools.ts:1487) with an MCP dispatch branch \'97 after the    \
  existing if/else if chain, add a fallback that routes unknown tool names to an MCP      \
  client.\
\
  1. Add a mcpTools?: OpenAIToolSchema[] parameter to StreamChatParams\
  (backend/src/lib/llm/types.ts:44) and concatenate them into the tools array before calling\
  streamChatWithTools.\
  2. Extend runToolCalls (chatTools.ts:1487) with an MCP dispatch branch \'97 after the existing\
  if/else if chain, add a fallback that routes unknown tool names to an MCP client.\
  3. Expose an MCP server from the backend that surfaces the existing tools to external clients\
  (the generate_docx, edit_document, read_document tools are already well-specified).\
\
  The StreamChatParams.runTools callback (types.ts:51) is already designed as an injectable async\
  function that takes NormalizedToolCall[] and returns NormalizedToolResult[]. This is the\
  cleanest hook point \'97 an MCP client wrapper could satisfy that interface directly.\
\
  Specific files and lines:\
  - backend/src/lib/llm/types.ts:51 \'97 runTools?: (calls: NormalizedToolCall[]) =>\
  Promise<NormalizedToolResult[]>\
  - backend/src/lib/chatTools.ts:1487 \'97 runToolCalls() \'97 where new dispatch branches would go\
  - backend/src/lib/llm/index.ts:9 \'97 streamChatWithTools() \'97 where the tools array is passed\
  3. Expose an MCP server from the backend that surfaces the existing tools to external clients (the generate_docx, edit_document,\
  read_document tools are already well-specified).\
\
  The StreamChatParams.runTools callback (types.ts:51) is already designed as an injectable async function that takes\
  NormalizedToolCall[] and returns NormalizedToolResult[]. This is the cleanest hook point \'97 an MCP client wrapper could satisfy\
  that interface directly.\
\
  Specific files and lines:\
  - backend/src/lib/llm/types.ts:51 \'97 runTools?: (calls: NormalizedToolCall[]) => Promise<NormalizedToolResult[]>\
  - backend/src/lib/chatTools.ts:1487 \'97 runToolCalls() \'97 where new dispatch branches would go\
  - backend/src/lib/llm/index.ts:9 \'97 streamChatWithTools() \'97 where the tools array is passed through\
\
  ---\
  10. Verification and Trust Surface\
\
  Citations exist and are structural, not cosmetic.\
\
  The natural insertion point is runLLMStream in backend/src/lib/chatTools.ts. That function currently receives a\
  workflowStore and tabularStore and constructs the tool list by concatenating constants (TOOLS, PROJECT_EXTRA_TOOLS,\
  WORKFLOW_TOOLS). An MCP host could:\
\
  1. Add a mcpTools?: OpenAIToolSchema[] parameter to StreamChatParams (backend/src/lib/llm/types.ts:44) and concatenate them\
  into the tools array before calling streamChatWithTools.\
  2. Extend runToolCalls (chatTools.ts:1487) with an MCP dispatch branch \'97 after the existing if/else if chain, add a fallback\
   that routes unknown tool names to an MCP client.\
  3. Expose an MCP server from the backend that surfaces the existing tools to external clients (the generate_docx,\
  edit_document, read_document tools are already well-specified).\
\
  The StreamChatParams.runTools callback (types.ts:51) is already designed as an injectable async function that takes\
  NormalizedToolCall[] and returns NormalizedToolResult[]. This is the cleanest hook point \'97 an MCP client wrapper could\
  satisfy that interface directly.\
\
  Specific files and lines:\
  - backend/src/lib/llm/types.ts:51 \'97 runTools?: (calls: NormalizedToolCall[]) => Promise<NormalizedToolResult[]>\
  - backend/src/lib/chatTools.ts:1487 \'97 runToolCalls() \'97 where new dispatch branches would go\
  - backend/src/lib/llm/index.ts:9 \'97 streamChatWithTools() \'97 where the tools array is passed through\
  1. Add a mcpTools?: OpenAIToolSchema[] parameter to StreamChatParams (backend/src/lib/llm/types.ts:44) and concatenate\
  them into the tools array before calling streamChatWithTools.\
  2. Extend runToolCalls (chatTools.ts:1487) with an MCP dispatch branch \'97 after the existing if/else if chain, add a\
  fallback that routes unknown tool names to an MCP client.\
  3. Expose an MCP server from the backend that surfaces the existing tools to external clients (the generate_docx,\
  edit_document, read_document tools are already well-specified).\
\
  constructs the tool list by concatenating constants (TOOLS, PROJECT_EXTRA_TOOLS, WORKFLOW_TOOLS). An MCP host could:\
\
  1. Add a mcpTools?: OpenAIToolSchema[] parameter to StreamChatParams (backend/src/lib/llm/types.ts:44) and concatenate them into the tools array\
  before calling streamChatWithTools.\
  2. Extend runToolCalls (chatTools.ts:1487) with an MCP dispatch branch \'97 after the existing if/else if chain, add a fallback that routes unknown tool\
   names to an MCP client.\
  3. Expose an MCP server from the backend that surfaces the existing tools to external clients (the generate_docx, edit_document, read_document tools\
  are already well-specified).\
\
  The StreamChatParams.runTools callback (types.ts:51) is already designed as an injectable async function that takes NormalizedToolCall[] and returns\
  NormalizedToolResult[]. This is the cleanest hook point \'97 an MCP client wrapper could satisfy that interface directly.\
\
  Specific files and lines:\
  - backend/src/lib/llm/types.ts:51 \'97 runTools?: (calls: NormalizedToolCall[]) => Promise<NormalizedToolResult[]>\
  - backend/src/lib/chatTools.ts:1487 \'97 runToolCalls() \'97 where new dispatch branches would go\
  - backend/src/lib/llm/index.ts:9 \'97 streamChatWithTools() \'97 where the tools array is passed through\
\
  ---\
  10. Verification and Trust Surface\
\
  Citations exist and are structural, not cosmetic.\
\
  Inline citation format: The system prompt (chatTools.ts:78) instructs the model to place [N] numbered markers inline in pr\
\
  \uc0\u9484 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9516 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9488 \
  \uc0\u9474     Tool name     \u9474                                            What it does                                            \u9474 \
  \uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9532 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
  \uc0\u9474  read_table_cells \u9474  Returns extracted cell values from TabularCellStore filtered by col_indices and row_indices;      \u9474 \
  \uc0\u9474                   \u9474  emits a doc_read_start event with column \'d7 row count                                              \u9474 \
  \uc0\u9492 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9524 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9496 \
\
  Tool set for each context:\
  - Free-form chat: TOOLS + WORKFLOW_TOOLS\
  - Project chat: TOOLS + PROJECT_EXTRA_TOOLS + WORKFLOW_TOOLS\
  - Tabular review chat: TABULAR_TOOLS only\
\
  ---\
  9. MCP Readiness\
\
  MCP client code: None. No imports of @modelcontextprotocol/sdk appear anywhere in backend/src/ or frontend/src/.\
\
  MCP server code: None.\
\
  Package presence: @modelcontextprotocol/sdk ^1.25.2 appears in backend/package-lock.json as an optional/transitive\
  dependency \'97 not in backend/package.json dependencies. It is not installed or used.\
\
  Where an MCP host integration would slot in:\
\
  The natural insertion point is runLLMStream in backend/src/lib/chatTools.ts. That function currently receives a\
  workflowStore and tabularStore and constructs the tool list by concatenating constants (TOOLS, PROJECT_EXTRA_TOOLS,\
  WORKFLOW_TOOLS). An MCP host could:\
\
  1. Add a mcpTools?: OpenAIToolSchema[] parameter to StreamChatParams (backend/src/lib/llm/types.ts:44) and concatenate\
  them into the tools array before calling streamChatWithTools.\
  2. Extend runToolCalls (chatTools.ts:1487) with an MCP dispatch branch \'97 after the existing if/else if chain, add a\
  fallback that routes unknown tool names to an MCP client.\
  3. Expose an MCP server from the backend that surfaces the existing tools to external clients (the generate_docx,\
  edit_document, read_document tools are already well-specified).\
\
  The StreamChatParams.runTools callback (types.ts:51) is already designed as an injectable async function that takes\
  NormalizedToolCall[] and returns NormalizedToolResult[]. This is the cleanest hook point \'97 an MCP client wrapper could\
  satisfy that interface directly.\
\
  Specific files and lines:\
  - backend/src/lib/llm/types.ts:51 \'97 runTools?: (calls: NormalizedToolCall[]) => Promise<NormalizedToolResult[]>\
  - backend/src/lib/chatTools.ts:1487 \'97 runToolCalls() \'97 where new dispatch branches would go\
  - backend/src/lib/llm/index.ts:9 \'97 streamChatWithTools() \'97 where the tools array is passed through\
\
  ---\
  10. Verification and Trust Surface\
\
  Citations exist and are structural, not cosmetic.\
\
  Inline citation format: The system prompt (chatTools.ts:78) instructs the model to place [N] numbered markers inline in\
  prose and append a <CITATIONS> JSON block at the end:\
  [\
    \{"ref": 1, "doc_id": "doc-0", "page": 3, "quote": "exact verbatim text \uc0\u8804 25 words"\},\
    \{"ref": 2, "doc_id": "doc-1", "page": "41-42", "quote": "...[[PAGE_BREAK]]..."\}\
  ]\
\
  Server-side parsing: extractAnnotations in chatTools.ts strips the <CITATIONS> block from the displayed text, parses the\
  JSON, resolves doc_id slugs to real document_id UUIDs and version_id pointers, and stores the result in\
  chat_messages.annotations (JSONB).\
\
  Frontend rendering: cite-button renders [N] as a clickable superscript. On click, highlightQuote.ts /\
  highlightDocxQuote.ts attempts to scroll the PDF or DOCX viewer to the page and highlight the quoted text.\
  citation-utils.ts:expandCitationToEntries() splits cross-page citations (those with [[PAGE_BREAK]]) into per-page\
  highlight entries.\
\
  Tabular citation format is different: inline [[page:N||quote:...]] markers in the reasoning field, parsed at cell-render\
  time in frontend/src/app/components/tabular/citation-utils.ts.\
\
  What is not present:\
  - No claim verification or hallucination detection beyond requiring verbatim quotes\
  - No cross-checking that quotes actually appear in the document (the model is instructed to use verbatim text, but this is\
   not programmatically validated server-side)\
  - No confidence scores or uncertainty indicators\
  - No external source lookup or legal database integration\
\
  ---\
  11. Open Questions\
\
  1. RLS gap: Only user_profiles has Postgres row-level security. All other tables are protected solely by Express\
  middleware. Is this intentional, and is there a risk that a misconfigured route or a future direct Supabase client call\
  would bypass these checks?\
  2. chat_messages.workflow column: The schema (000_one_shot_schema.sql) does not define a workflow column on chat_messages,\
   but chat.ts:394-400 writes workflow: lastUser.workflow ?? null to the insert. Is this column added in an incremental\
  migration file not present in the repo, or is it silently dropped by Supabase?\
  3. Context window limits: Documents are loaded in full on every tool call. What happens when the concatenated text of all\
  documents in a project exceeds the model's context window? Is there any truncation, chunking, or fallback logic? None is\
  visible in the code.\
  4. LibreOffice dependency: libreoffice-convert requires a system LibreOffice installation. How is this provisioned in the\
  deployment environment (Docker image, server setup script)? There is no Dockerfile or deployment configuration in the\
  repo.\
  5. Credit system: user_profiles.message_credits_used and credits_reset_date exist in the schema. Where is credit\
  consumption tracked and enforced? No decrement or enforcement logic is visible in the reviewed routes.\
  6. @openrouter/sdk 0.3.11 appears in frontend/package.json but OPENROUTER_API_KEY is in the backend .env.example and no\
  OpenRouter calls appear in backend/src/. Is OpenRouter used anywhere, or is it a leftover dependency?\
  7. Model IDs look speculative: gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-3.1-flash-lite-preview are in\
  models.ts. These do not match currently published Google model IDs (e.g., gemini-2.0-flash). Are these internal preview\
  IDs, or placeholders? Are the Gemini calls actually succeeding against the real API?\
  8. chat_messages.content type: In the schema, content is jsonb. The code stores AssistantEvent[] arrays there for\
  assistant messages. For user messages, chat.ts:394 writes the plain string lastUser.content. Is this a type inconsistency,\
   and how does the frontend handle both shapes on load?\
  9. projects.user_id is text, not uuid: All other user-scoped tables use text for user_id as well. Supabase auth.uid()\
  returns a UUID. Is this intentional (storing string representations), and why is there no FK to auth.users on these\
  tables?\
  10. Tabular cell generation is not streamed: POST /tabular-review/:reviewId/generate uses non-streaming completeText for\
  each cell. For large reviews (many documents \'d7 many columns), this could mean very long HTTP response times. Is there a\
  background job system or a streaming alternative planned?}