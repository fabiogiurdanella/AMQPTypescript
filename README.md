    const bbpaymentsAMQPProvider = AMQPProvider.createIstance(bbpaymentsConsumerQueue, bbpaymentsProducerQueue, AMQPProviderType.BBPAYMENTS);
    bbpaymentsAMQPProvider.provideListening();
    bbpaymentsAMQPProvider.providePublishing();
