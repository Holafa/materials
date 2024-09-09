export function randomUniformDistribution(totalAmount: number, parts: number): number[] {
    // TODO[UX]: generate at least a minimum amount.

    if (parts <= 0) throw new Error("Number of parts must be greater than 0");
    if (totalAmount < 0) throw new Error("Total amount must be non-negative");

    const randomValues: number[] = [];
    for (let i = 0; i < parts; i++) {
        randomValues.push(Math.random());
    }

    randomValues.sort((a, b) => a - b);

    const sum = randomValues.reduce((acc, value) => acc + value, 0);
    return randomValues.map(value => (value / sum) * totalAmount);
}
