from easydict import EasyDict as edict

config = edict()

# ArcFace margin setup
config.margin_list = (1.0, 0.5, 0.0)

# Lightweight recognizer for later Jetson deployment
config.network = "mbf"
config.embedding_size = 512

# Training control
config.resume = False
config.save_all_states = True
config.output = "/home/lzh/work/classsight-face-train/outputs/recognizer/casia_webface_mbf_classsight"
config.num_epoch = 24
config.warmup_epoch = 0

# Dataset location
# Start with plain ImageFolder layout. Later runs can switch to RecordIO
# without changing the rest of the pipeline.
config.rec = "/home/lzh/work/classsight-face-train/datasets/casia_webface"
config.num_classes = 10575
config.num_image = 494414
config.val_targets = []

# Optimization
config.sample_rate = 1.0
config.interclass_filtering_threshold = 0
config.fp16 = True
config.optimizer = "sgd"
config.batch_size = 128
config.lr = 0.05
config.momentum = 0.9
config.weight_decay = 1e-4
config.gradient_acc = 1

# Logging and workers
config.verbose = 1000
config.frequent = 20
config.dali = False
config.dali_aug = False
config.seed = 2048
config.num_workers = 8

# WandB stays off for the baseline run
config.wandb_key = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
config.suffix_run_name = "classsight-casia-mbf"
config.using_wandb = False
config.wandb_entity = "entity"
config.wandb_project = "project"
config.wandb_log_all = False
config.save_artifacts = False
config.wandb_resume = False
