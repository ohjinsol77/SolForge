#pragma once
#include <stdint.h>

struct BootAnimationFrame {
  uint32_t offset;
  uint32_t wordCount;
  uint16_t durationMs;
};

extern const uint16_t bootAnimationData[];
extern const BootAnimationFrame bootAnimationFrames[];
extern const uint16_t bootAnimationFrameCount;
