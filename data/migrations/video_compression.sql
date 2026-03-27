CREATE TABLE VideoTimerVideoCompressionStatuses (
  id TINYINT UNSIGNED NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vtvcs_code (code),
  UNIQUE KEY uq_vtvcs_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO VideoTimerVideoCompressionStatuses (id, code, name, description)
VALUES
  (1, 'none', 'None', 'Video has no compression workflow associated with it yet.'),
  (2, 'pending', 'Pending', 'Upload completed but compression should only be queued later.'),
  (3, 'queued', 'Queued', 'Video is queued and waiting for background compression.'),
  (4, 'processing', 'Processing', 'Video compression is currently running.'),
  (5, 'completed', 'Completed', 'Compression completed successfully and the compressed file is now the playback source.'),
  (6, 'failed', 'Failed', 'Compression failed and needs retry or manual review.');

ALTER TABLE VideoTimerVideos
  ADD COLUMN uploadKey VARCHAR(255) NULL AFTER playbackUrl,
  ADD COLUMN originalPlaybackUrl TEXT NULL AFTER uploadKey,
  ADD COLUMN originalUploadKey VARCHAR(255) NULL AFTER originalPlaybackUrl,
  ADD COLUMN originalSize BIGINT UNSIGNED NULL AFTER size,
  ADD COLUMN compressedPlaybackUrl TEXT NULL AFTER originalSize,
  ADD COLUMN compressedUploadKey VARCHAR(255) NULL AFTER compressedPlaybackUrl,
  ADD COLUMN compressedSize BIGINT UNSIGNED NULL AFTER compressedUploadKey,
  ADD COLUMN compressionStatusId TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER compressedSize,
  ADD COLUMN compressionError TEXT NULL AFTER compressionStatusId,
  ADD COLUMN compressionQueuedAt DATETIME NULL AFTER compressionError,
  ADD COLUMN compressionStartedAt DATETIME NULL AFTER compressionQueuedAt,
  ADD COLUMN compressionCompletedAt DATETIME NULL AFTER compressionStartedAt,
  ADD KEY idx_vtv_compression_status_id (compressionStatusId),
  ADD CONSTRAINT fk_vtv_compression_status_id
    FOREIGN KEY (compressionStatusId)
    REFERENCES VideoTimerVideoCompressionStatuses (id);

SET SQL_SAFE_UPDATES = 0;

UPDATE VideoTimerVideos
SET
  originalPlaybackUrl = COALESCE(originalPlaybackUrl, playbackUrl),
  originalSize = COALESCE(originalSize, size),
  originalUploadKey = COALESCE(
    originalUploadKey,
    CASE
      WHEN playbackUrl LIKE 'https://d14jmci8as6gbr.cloudfront.net/%'
        THEN REPLACE(playbackUrl, 'https://d14jmci8as6gbr.cloudfront.net/', '')
      ELSE NULL
    END
  ),
  uploadKey = COALESCE(
    uploadKey,
    CASE
      WHEN playbackUrl LIKE 'https://d14jmci8as6gbr.cloudfront.net/%'
        THEN REPLACE(playbackUrl, 'https://d14jmci8as6gbr.cloudfront.net/', '')
      ELSE NULL
    END
  );

SET SQL_SAFE_UPDATES = 1;