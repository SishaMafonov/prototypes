# Historical v14 source snapshot

These are the exact bytes of the four audited source files changed by v15 bonus floor doubling. The original SHA-256 values remain in `../rtp-v14-1b.json`; the historical calibration test checks them here. Other audited files are unchanged and checked at their normal project paths. Do not edit these snapshot files when changing current gameplay.

`config.json` contains the frozen v14 configuration from that report. It has no `BonusFloorDoubling` flag, so current simulation engines retain the former linear coins and unscaled multiplier prizes when replaying it. The published 96% evidence applies to that configuration only. Current floor rewards are described in [module16](../../16-bonus-floor-prizes.md).
